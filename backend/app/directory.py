"""The staff directory, read from PostgreSQL.

Every endpoint here goes through resolve_access, so what a caller sees is decided
by the org chart at request time and never by anything the client sends.

Two FSD rules are visible in the SQL rather than in a comment:

  * PERSON.date_of_birth is a restricted field and is never selected here. The
    directory cannot leak it because it is not in the query.

  * "Currently" always means person_role.valid_to IS NULL. History is closed by
    setting that date, so a past seat stays queryable and never shows up as
    current.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from . import db
from .access import resolve_access
from .auth import get_current_user_email

router = APIRouter(prefix="/api/directory", tags=["directory"])


class SeatOut(BaseModel):
    role_id: str
    title: str
    department: str
    level: int | None
    is_primary: bool
    base_tier: str


class DirectoryEntryOut(BaseModel):
    person_id: str
    display_name: str
    email: str | None
    seats: list[SeatOut]
    resolved_tier: str


class HeadcountRowOut(BaseModel):
    department: str
    filled_seats: int
    open_seats: int
    people: int


def _profile(email: str):
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(status_code=403, detail=f"{email} is not a recognized KATBOTZ org member")
    if not db.postgres_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    return profile


_TIER_RANK = {"intern": 1, "employee": 2, "hr_admin": 3, "founder": 4}
_TIER_NAME = {1: "intern", 2: "employee", 3: "hr_admin", 4: "founder"}


@router.get("", response_model=list[DirectoryEntryOut])
def directory(email: str = Depends(get_current_user_email)) -> list[DirectoryEntryOut]:
    """Everyone the caller is allowed to see, with the seats they currently hold."""
    profile = _profile(email)

    scoped = profile.visible_person_ids
    if scoped == "all":
        where, params = "", {}
    else:
        # An empty scope means the caller sees nobody but themselves, which is the
        # correct answer while no reporting lines are authored — not "everyone".
        where = " WHERE p.person_id = ANY(:ids)"
        params = {"ids": list(scoped)}

    records = db.rows(
        "SELECT p.person_id,"
        "       coalesce(p.preferred_name, concat_ws(' ', p.first_name, p.last_name)) AS display_name,"
        "       (SELECT email FROM person_email e"
        "         WHERE e.person_id = p.person_id AND e.email_type = 'professional'"
        "         ORDER BY e.email LIMIT 1) AS email,"
        "       r.role_id, r.title, r.level, r.base_tier,"
        "       coalesce(pr.is_primary, false) AS is_primary,"
        "       d.name AS department"
        "  FROM person p"
        "  LEFT JOIN person_role pr ON pr.person_id = p.person_id AND pr.valid_to IS NULL"
        "  LEFT JOIN role r         ON r.role_id = pr.role_id AND r.is_active"
        "  LEFT JOIN department d   ON d.department_id = r.department_id"
        f"{where}"
        " ORDER BY display_name, pr.is_primary DESC, r.title",
        **params,
    )

    grouped: dict[str, DirectoryEntryOut] = {}
    ranks: dict[str, int] = {}
    for row in records:
        pid = str(row["person_id"])
        entry = grouped.get(pid)
        if entry is None:
            entry = DirectoryEntryOut(
                person_id=pid, display_name=row["display_name"], email=row["email"],
                seats=[], resolved_tier="employee",
            )
            grouped[pid] = entry
            ranks[pid] = 0
        if row["role_id"] is None:
            continue
        entry.seats.append(SeatOut(
            role_id=str(row["role_id"]), title=row["title"], department=row["department"],
            level=row["level"], is_primary=bool(row["is_primary"]), base_tier=row["base_tier"],
        ))
        ranks[pid] = max(ranks[pid], _TIER_RANK.get(row["base_tier"], 0))

    for pid, entry in grouped.items():
        # Same precedence as access.py: the highest tier across every seat held.
        entry.resolved_tier = _TIER_NAME.get(ranks[pid], "employee")
    return list(grouped.values())


@router.get("/headcount", response_model=list[HeadcountRowOut])
def headcount(email: str = Depends(get_current_user_email)) -> list[HeadcountRowOut]:
    """Seats and people per department.

    Counted from ROLE, because this is the org chart. Once engagements exist,
    payroll headcount should be counted from EMPLOYMENT_ASSIGNMENT instead —
    that is the authoritative department for an engaged worker, and it is the
    one that can answer the question for a past date.
    """
    profile = _profile(email)
    if profile.tier not in ("founder", "hr"):
        raise HTTPException(status_code=403, detail="Headcount is available to the founder and HR tiers")

    return [
        HeadcountRowOut(
            department=r["department"], filled_seats=r["filled_seats"],
            open_seats=r["open_seats"], people=r["people"],
        )
        for r in db.rows(
            "SELECT d.name AS department,"
            "       count(pr.person_role_id)::int AS filled_seats,"
            "       count(*) FILTER (WHERE pr.person_role_id IS NULL)::int AS open_seats,"
            "       count(DISTINCT pr.person_id)::int AS people"
            "  FROM department d"
            "  JOIN role r ON r.department_id = d.department_id AND r.is_active"
            "  LEFT JOIN person_role pr ON pr.role_id = r.role_id AND pr.valid_to IS NULL"
            " WHERE NOT d.is_root"
            " GROUP BY d.name"
            " ORDER BY people DESC, d.name"
        )
    ]


@router.get("/search", response_model=list[DirectoryEntryOut])
def search(q: str = Query(min_length=2), email: str = Depends(get_current_user_email)) -> list[DirectoryEntryOut]:
    """Directory search that tolerates misspelling, via the trigram index.

    concat_ws, not ||: last_name is nullable because the real org matrix contains
    mononyms, and 'Akshat' || ' ' || NULL would be NULL — which would silently
    drop every single-name person out of the results.
    """
    profile = _profile(email)
    # similarity(...) >= threshold rather than the % operator: the threshold is
    # then explicit in the query instead of hidden in a session GUC, and there is
    # no percent-sign escaping to get wrong in the driver layer.
    matches = db.rows(
        "SELECT person_id,"
        "       similarity(concat_ws(' ', first_name, last_name, preferred_name), :q) AS score"
        "  FROM person"
        " WHERE similarity(concat_ws(' ', first_name, last_name, preferred_name), :q) >= 0.2"
        " ORDER BY score DESC"
        " LIMIT 20",
        q=q,
    )
    allowed = {str(m["person_id"]) for m in matches}
    if profile.visible_person_ids != "all":
        allowed &= set(profile.visible_person_ids)
    return [e for e in directory(email) if e.person_id in allowed]
