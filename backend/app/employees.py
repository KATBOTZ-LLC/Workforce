"""Onboarding a worker, and listing the roster — on PostgreSQL.

Creating a worker is a single transaction across six tables. The FSD rules that
shape it are enforced by the database, not by checks in this file:

  * One email identifies one worker, case-insensitively, across both address
    types and the whole organisation. A duplicate raises here as a unique
    violation and is reported as 409 — the check and the write are the same
    operation, so two simultaneous submissions cannot both win.

  * WORKER_DOCUMENT.is_mandatory is COPIED from DOCUMENT_REQUIREMENT and frozen.
    Editing a requirement later cannot move the activation gate under a
    candidate who is already halfway through onboarding.

  * The checklist is selected by worker type x region x contractor mode, where
    region comes from the engagement's WORK_LOCATION. The circulated design put
    region on the requirement with nothing on the worker side to match it.

  * Only the token's hash is stored. The link is returned exactly once, here,
    and cannot be recovered from the database afterwards.
"""

import hashlib
import secrets
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError

from . import db
from .access import resolve_access
from .auth import get_current_user_email

router = APIRouter(prefix="/api/employees", tags=["employees"])

TOKEN_VALID_DAYS = 7  # per the FSD


class CreateWorkerRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    professional_email: EmailStr
    personal_email: EmailStr | None = None
    worker_type: str = Field(pattern="^(Employee|Contractor|Intern)$")
    contractor_mode: str | None = Field(default=None, pattern="^(independent|c2c)$")
    designation: str = Field(min_length=1, max_length=200)
    department_id: str
    work_location_id: str
    hr_lead_person_id: str | None = None
    joined_on: date


class CreateWorkerResponse(BaseModel):
    person_id: str
    employment_id: str
    employment_code: str
    stage: str
    region: str
    documents_required: int
    documents_mandatory: int
    onboarding_url: str
    onboarding_token: str


class RosterRow(BaseModel):
    employment_id: str
    employment_code: str
    person_id: str
    display_name: str
    professional_email: str | None
    worker_type: str
    contractor_mode: str | None
    designation: str
    department: str | None
    work_location: str | None
    region: str | None
    hr_lead: str | None
    joined_on: date
    exited_on: date | None
    stage: str
    docs_total: int
    docs_approved: int
    docs_mandatory_outstanding: int
    can_activate: bool


def _require_hr(email: str):
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(status_code=403, detail=f"{email} is not a recognized KATBOTZ org member")
    if not db.postgres_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    if profile.tier not in ("founder", "hr"):
        raise HTTPException(status_code=403, detail="Onboarding is available to the founder and HR tiers")
    return profile


@router.post("", response_model=CreateWorkerResponse, status_code=201)
def create_worker(payload: CreateWorkerRequest, email: str = Depends(get_current_user_email)) -> CreateWorkerResponse:
    _require_hr(email)

    if payload.worker_type == "Contractor" and payload.contractor_mode is None:
        raise HTTPException(status_code=422, detail="contractor_mode is required for a Contractor")
    if payload.worker_type != "Contractor" and payload.contractor_mode is not None:
        raise HTTPException(status_code=422, detail="contractor_mode only applies to a Contractor")

    raw_token = secrets.token_urlsafe(24)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    try:
        with db.transaction() as tx:
            location = tx.one(
                "SELECT name, region FROM work_location WHERE work_location_id = :id",
                id=payload.work_location_id,
            )
            if location is None:
                raise HTTPException(status_code=422, detail="Unknown work_location_id")
            region = location["region"]

            if tx.one("SELECT 1 AS ok FROM department WHERE department_id = :id AND is_active",
                      id=payload.department_id) is None:
                raise HTTPException(status_code=422, detail="Unknown or inactive department_id")

            person = tx.one(
                "INSERT INTO person (first_name, last_name, preferred_name)"
                " VALUES (:first, :last, :preferred)"
                " RETURNING person_id",
                first=payload.first_name,
                last=payload.last_name,
                preferred=" ".join(x for x in (payload.first_name, payload.last_name) if x),
            )
            person_id = str(person["person_id"])

            # Held as rows, so one unique index on lower(email) enforces the FSD
            # rule across both address types at once.
            tx.execute(
                "INSERT INTO person_email (person_id, email_type, email)"
                " VALUES (:pid, 'professional', :email)",
                pid=person_id, email=str(payload.professional_email),
            )
            if payload.personal_email:
                tx.execute(
                    "INSERT INTO person_email (person_id, email_type, email)"
                    " VALUES (:pid, 'personal', :email)",
                    pid=person_id, email=str(payload.personal_email),
                )

            employment = tx.one(
                "INSERT INTO employment"
                " (employment_code, person_id, worker_type, contractor_mode,"
                "  designation, joined_on, stage)"
                " VALUES ('EMP-' || lpad(nextval('employment_code_seq')::text, 3, '0'),"
                "         :pid, :wtype, :cmode, :desig, :joined, 'Invited')"
                " RETURNING employment_id, employment_code, stage",
                pid=person_id, wtype=payload.worker_type, cmode=payload.contractor_mode,
                desig=payload.designation, joined=payload.joined_on,
            )
            employment_id = str(employment["employment_id"])

            # valid_to stays NULL: this is the current placement, and the partial
            # unique index guarantees there is only ever one.
            tx.execute(
                "INSERT INTO employment_assignment"
                " (employment_id, department_id, hr_lead_person_id, work_location_id, valid_from)"
                " VALUES (:eid, :dept, :lead, :loc, :from_date)",
                eid=employment_id, dept=payload.department_id,
                lead=payload.hr_lead_person_id, loc=payload.work_location_id,
                from_date=payload.joined_on,
            )

            # is_mandatory is copied, not joined, so it is frozen at creation.
            created = tx.rows(
                "INSERT INTO worker_document"
                " (employment_id, requirement_id, is_mandatory, status)"
                " SELECT :eid, r.requirement_id, r.is_mandatory, 'Outstanding'"
                "   FROM document_requirement r"
                "  WHERE (r.worker_type IS NULL OR r.worker_type = :wtype)"
                "    AND (r.region IS NULL OR r.region = :region)"
                "    AND (r.contractor_mode IS NULL OR r.contractor_mode = :cmode)"
                " RETURNING is_mandatory",
                eid=employment_id, wtype=payload.worker_type,
                region=region, cmode=payload.contractor_mode,
            )
            if not created:
                raise HTTPException(
                    status_code=422,
                    detail=f"No document checklist is configured for {payload.worker_type} in {region}",
                )

            tx.execute(
                "INSERT INTO onboarding_token"
                " (employment_id, token_hash, issued_at, expires_at, status)"
                " VALUES (:eid, :hash, now(), now() + make_interval(days => :days), 'active')",
                eid=employment_id, hash=token_hash, days=TOKEN_VALID_DAYS,
            )

            return CreateWorkerResponse(
                person_id=person_id,
                employment_id=employment_id,
                employment_code=employment["employment_code"],
                stage=employment["stage"],
                region=region,
                documents_required=len(created),
                documents_mandatory=sum(1 for r in created if r["is_mandatory"]),
                onboarding_url=f"/onboard/{raw_token}",
                onboarding_token=raw_token,
            )
    except IntegrityError as exc:
        detail = str(getattr(exc, "orig", exc))
        if "uq_person_email_lower" in detail:
            raise HTTPException(
                status_code=409,
                detail="That email address already belongs to another worker. "
                       "One email identifies one worker, org-wide.",
            ) from exc
        raise HTTPException(status_code=409, detail=f"The database refused this record: {detail}") from exc


@router.get("", response_model=list[RosterRow])
def roster(email: str = Depends(get_current_user_email)) -> list[RosterRow]:
    """The roster, with checklist progress per engagement.

    docs_mandatory_outstanding IS the activation gate: an account may be created
    only when it reaches zero. It is counted here from the same rows the gate
    counts, rather than from a separate status field that could disagree.
    """
    profile = _require_hr(email)
    return [
        RosterRow(**{**r,
                     "employment_id": str(r["employment_id"]),
                     "person_id": str(r["person_id"]),
                     "can_activate": r["docs_mandatory_outstanding"] == 0 and r["stage"] != "Active"})
        for r in db.rows(
            "SELECT e.employment_id, e.employment_code, e.person_id,"
            "       coalesce(p.preferred_name, concat_ws(' ', p.first_name, p.last_name)) AS display_name,"
            "       (SELECT email FROM person_email pe"
            "         WHERE pe.person_id = p.person_id AND pe.email_type = 'professional'"
            "         ORDER BY pe.email LIMIT 1) AS professional_email,"
            "       e.worker_type, e.contractor_mode, e.designation,"
            "       d.name AS department, wl.name AS work_location, wl.region,"
            "       coalesce(hr.preferred_name, concat_ws(' ', hr.first_name, hr.last_name)) AS hr_lead,"
            "       e.joined_on, e.exited_on, e.stage,"
            "       count(wd.document_id)::int AS docs_total,"
            "       count(wd.document_id) FILTER (WHERE wd.status = 'Approved')::int AS docs_approved,"
            "       count(wd.document_id) FILTER (WHERE wd.is_mandatory AND wd.status <> 'Approved')::int"
            "         AS docs_mandatory_outstanding"
            "  FROM employment e"
            "  JOIN person p ON p.person_id = e.person_id"
            "  LEFT JOIN employment_assignment ea"
            "    ON ea.employment_id = e.employment_id AND ea.valid_to IS NULL"
            "  LEFT JOIN department d    ON d.department_id = ea.department_id"
            "  LEFT JOIN work_location wl ON wl.work_location_id = ea.work_location_id"
            "  LEFT JOIN person hr        ON hr.person_id = ea.hr_lead_person_id"
            "  LEFT JOIN worker_document wd ON wd.employment_id = e.employment_id"
            " GROUP BY e.employment_id, e.employment_code, e.person_id, p.person_id,"
            "          p.preferred_name, p.first_name, p.last_name, e.worker_type,"
            "          e.contractor_mode, e.designation, d.name, wl.name, wl.region,"
            "          hr.preferred_name, hr.first_name, hr.last_name,"
            "          e.joined_on, e.exited_on, e.stage"
            " ORDER BY e.employment_code"
        )
    ]


class ActivateOut(BaseModel):
    employment_id: str
    employment_code: str
    stage: str
    message: str


@router.post("/{employment_id}/activate", response_model=ActivateOut)
def activate(employment_id: str, email: str = Depends(get_current_user_email)) -> ActivateOut:
    """Turn a verified engagement into one that may sign in.

    "No account until every mandatory document is approved" is enforced here the
    way the blueprint specifies: the count runs inside a transaction that holds
    a row lock on EMPLOYMENT. Two HR users clicking Activate at the same moment
    cannot both succeed — the second waits for the first, then re-reads and sees
    the new stage.

    It deliberately does NOT create a USER_ACCOUNT row. That table needs
    Google's immutable subject id, which does not exist until the person
    actually signs in, and it is NOT NULL because a login with no subject id
    cannot be matched to a Google identity later. The account is created on
    first sign-in; activation is what permits that sign-in to happen.
    """
    profile = _require_hr(email)

    with db.transaction() as tx:
        e = tx.one(
            "SELECT employment_id, employment_code, stage, person_id"
            "  FROM employment WHERE employment_id = :eid FOR UPDATE",
            eid=employment_id,
        )
        if e is None:
            raise HTTPException(status_code=404, detail="No such engagement")
        if e["stage"] == "Active":
            return ActivateOut(
                employment_id=employment_id, employment_code=e["employment_code"],
                stage="Active", message="Already active.",
            )

        outstanding = tx.rows(
            "SELECT r.document_name FROM worker_document wd"
            "  JOIN document_requirement r ON r.requirement_id = wd.requirement_id"
            " WHERE wd.employment_id = :eid AND wd.is_mandatory AND wd.status <> 'Approved'"
            " ORDER BY r.document_name",
            eid=employment_id,
        )
        if outstanding:
            names = ", ".join(r["document_name"] for r in outstanding[:5])
            more = f" and {len(outstanding) - 5} more" if len(outstanding) > 5 else ""
            raise HTTPException(
                status_code=409,
                detail=f"{len(outstanding)} mandatory document(s) are not approved: {names}{more}",
            )

        tx.execute(
            "UPDATE employment SET stage = 'Active' WHERE employment_id = :eid", eid=employment_id
        )
        # Any outstanding onboarding link is spent. Revoked rather than deleted,
        # so the fact that one was issued survives.
        tx.execute(
            "UPDATE onboarding_token SET status = 'expired'"
            " WHERE employment_id = :eid AND status = 'active'",
            eid=employment_id,
        )
        tx.execute(
            "INSERT INTO audit_log (actor_person_id, actor_tier, event_category,"
            "                       entity_type, entity_id, before_state, after_state)"
            " VALUES (:actor, :tier, 'permission_change', 'employment', :eid,"
            "         jsonb_build_object('stage', CAST(:before AS text)),"
            "         jsonb_build_object('stage', 'Active'))",
            actor=profile.person_id, tier=profile.tier, eid=employment_id, before=e["stage"],
        )

        return ActivateOut(
            employment_id=employment_id, employment_code=e["employment_code"], stage="Active",
            message="Activated. The person may now sign in with Google; their "
                    "USER_ACCOUNT row is created on first sign-in.",
        )


class OptionsResponse(BaseModel):
    departments: list[dict]
    work_locations: list[dict]
    hr_leads: list[dict]


@router.get("/options", response_model=OptionsResponse)
def options(email: str = Depends(get_current_user_email)) -> OptionsResponse:
    """What the create form may choose from. Served from the database so the form
    cannot offer a department or location that does not exist."""
    _require_hr(email)
    return OptionsResponse(
        departments=[{"id": str(r["department_id"]), "name": r["name"]} for r in db.rows(
            "SELECT department_id, name FROM department WHERE is_active AND NOT is_root ORDER BY name")],
        work_locations=[{"id": str(r["work_location_id"]), "name": r["name"], "region": r["region"]}
                        for r in db.rows(
            "SELECT work_location_id, name, region FROM work_location ORDER BY name")],
        hr_leads=[{"id": str(r["person_id"]), "name": r["name"]} for r in db.rows(
            "SELECT DISTINCT p.person_id,"
            "       coalesce(p.preferred_name, concat_ws(' ', p.first_name, p.last_name)) AS name"
            "  FROM person p"
            "  JOIN person_role pr ON pr.person_id = p.person_id AND pr.valid_to IS NULL"
            "  JOIN role r ON r.role_id = pr.role_id AND r.base_tier IN ('founder','hr_admin')"
            " ORDER BY name")],
    )
