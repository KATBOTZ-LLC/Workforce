"""The org chart, read from PostgreSQL.

This replaces the two hand-maintained copies of "the org" that org_data.py's
own docstring warns about: the TypeScript seed in the frontend and the Python
port here. Both are now seed data (db/migrations/96_seed_org.sql); Postgres is
the single source of truth and this module is the only thing that reads it.

Nothing here decides access. It returns the same Unit / Person / Role / Edge
shapes access.py already consumes, so the tier rules confirmed with the founder
on 2026-08-25 stay in exactly one place.

Two schema facts worth knowing when reading the queries below:

  * There is no tier column and no team-lead column. ROLE.base_tier is the
    tier a SEAT carries; a person's tier is resolved from the seats they
    currently hold. "Currently" means person_role.valid_to IS NULL — history
    is closed by setting that date, never overwritten.

  * Department comes from ROLE.department_id here because this is the org
    chart. For an engaged worker the authoritative department is
    EMPLOYMENT_ASSIGNMENT.department_id, which can differ (a secondment) and
    which contractors and interns have without holding a formal seat.
"""

from . import db
from .org_data import Edge, Person, Role, Unit

# The fixed id of the company root, seeded by 90_seed_root.sql. ROLE.department_id
# defaults to it so that deleting a department moves its seats to the root rather
# than deleting them.
ROOT_UNIT = "00000000-0000-0000-0000-000000000001"


class OrgSnapshot:
    """One consistent read of the chart. Built once per request so that every
    question asked during that request sees the same org."""

    def __init__(self, people: list[Person], units: list[Unit], roles: list[Role], edges: list[Edge]):
        self.people = people
        self.units = units
        self.roles = roles
        self.edges = edges
        self._person_by_id = {p.id: p for p in people}
        self._unit_by_id = {u.id: u for u in units}

    def person_by_id(self, person_id: str) -> Person | None:
        return self._person_by_id.get(person_id)

    def unit_by_id(self, unit_id: str) -> Unit | None:
        return self._unit_by_id.get(unit_id)

    def primary_role_of(self, person_id: str) -> Role | None:
        return next((r for r in self.roles if r.person_id == person_id and r.is_primary), None)

    def roles_of(self, person_id: str) -> list[Role]:
        return [r for r in self.roles if r.person_id == person_id]


def get_snapshot() -> OrgSnapshot:
    units = [
        Unit(id=str(r["department_id"]), name=r["name"],
             parent_id=str(r["parent_department_id"]) if r["parent_department_id"] else None)
        for r in db.rows(
            "SELECT department_id, name, parent_department_id FROM department"
            " WHERE is_active ORDER BY is_root DESC, name"
        )
    ]
    people = [
        Person(id=str(r["person_id"]), display_name=r["display_name"])
        for r in db.rows(
            "SELECT person_id,"
            "       coalesce(preferred_name, concat_ws(' ', first_name, last_name)) AS display_name"
            "  FROM person ORDER BY display_name"
        )
    ]
    # A seat with no current holder is an open position, not a person. The LEFT
    # JOIN keeps it, with person_id NULL — which is exactly how the org matrix
    # records a titled-but-vacant cell.
    roles = [
        Role(id=str(r["role_id"]),
             person_id=str(r["person_id"]) if r["person_id"] else None,
             unit_id=str(r["department_id"]),
             level=r["level"] if r["level"] is not None else 0,
             title=r["title"],
             is_primary=bool(r["is_primary"]),
             base_tier=r["base_tier"])
        for r in db.rows(
            "SELECT r.role_id, r.title, r.department_id, r.level, r.base_tier,"
            "       pr.person_id, coalesce(pr.is_primary, false) AS is_primary"
            "  FROM role r"
            "  LEFT JOIN person_role pr"
            "    ON pr.role_id = r.role_id AND pr.valid_to IS NULL"
            " WHERE r.is_active"
            " ORDER BY r.level, r.title"
        )
    ]
    # reports_to lives on the seat itself, so the chart needs no edge table.
    # Zero rows are populated: the source records level and department, never
    # who reports to whom, and no reporting line is invented here.
    edges = [
        Edge(id=f"edge_{r['role_id']}", from_role_id=str(r["role_id"]),
             to_role_id=str(r["reports_to_role_id"]), type="reports_to")
        for r in db.rows(
            "SELECT role_id, reports_to_role_id FROM role"
            " WHERE reports_to_role_id IS NOT NULL AND is_active"
        )
    ]
    return OrgSnapshot(people=people, units=units, roles=roles, edges=edges)


def person_id_for_email(email: str) -> str | None:
    """One email identifies one worker, case-insensitively, across both address
    types and the whole organisation. That is a single unique index on
    lower(email) in PERSON_EMAIL, so this lookup cannot return two people."""
    found = db.one(
        "SELECT person_id FROM person_email WHERE lower(email) = lower(:email)",
        email=email,
    )
    return str(found["person_id"]) if found else None
