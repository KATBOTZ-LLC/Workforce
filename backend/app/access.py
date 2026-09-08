"""Access tier and visibility scope, derived from the org chart — not stored,
not cached, not settable by a client. Recomputed on every request so it can never
drift the way a stored `orgRole` field could.

Two data sources, same rules either way:
  - Firestore configured (org_repo) → the real, live, editable org chart.
  - Firestore not configured (org_data) → the static seed, so login and access
    resolution keep working before Firestore/billing exist. See firestore_client.py.

Tier rules (confirmed with the founder 2026-08-25):
  - founder: the CEO only (person_ashish_katyayan) — not the wider C-suite.
  - hr:      anyone holding ANY role (not just their primary) inside the HR unit,
             or an HR-titled role elsewhere (e.g. "HR Legal & Compliance Lead" sits
             in Legal, but is functionally HR) — checked across all of a person's
             roles because several people here wear more than one hat.
  - intern:  primary role at Level 4 (matches the workforce store's own convention).
  - employee: everyone else.

Visibility scope: founder and hr see everyone. Everyone else sees only themselves
plus whoever transitively reports to them via `reports_to` edges — empty until
edges are authored. We don't grant visibility the org chart hasn't confirmed.
"""

from dataclasses import dataclass
from typing import Literal

from . import org_data
from .db import postgres_configured
from .firestore_client import firestore_configured
from .org_data import Edge, Person, Role

AccessTier = Literal["founder", "hr", "employee", "intern"]

FOUNDER_PERSON_ID = "person_ashish_katyayan"


@dataclass(frozen=True)
class AccessProfile:
    person_id: str
    display_name: str
    email: str
    role_title: str | None
    department: str | None
    tier: AccessTier
    can_edit_structure: bool
    visible_person_ids: list[str] | Literal["all"]


def _is_hr_role(role: Role) -> bool:
    return role.unit_id == "unit_hr" or "hr " in f"{role.title.lower()} " or role.title.lower().startswith("hr")


# ROLE.base_tier uses the schema blueprint's vocabulary; the API and frontend
# speak this one. Mapped here rather than in the database so the approved schema
# keeps its own names.
_TIER_FROM_BASE_TIER = {"founder": "founder", "hr_admin": "hr", "employee": "employee", "intern": "intern"}


def _tier_of(person_id: str, primary: Role | None, roles_of_person: list[Role]) -> AccessTier:
    """Same precedence in both directions: founder > intern > hr > employee.

    Confirmed with the founder 2026-08-25. Two implementations only because the
    data differs, not because the rules do: PostgreSQL carries the tier on the
    seat (ROLE.base_tier), while the hardcoded seed has to infer it from
    unit/level/title.
    """
    if any(r.base_tier is not None for r in roles_of_person):
        tiers = {r.base_tier for r in roles_of_person}
        if "founder" in tiers:
            return "founder"
        if primary is not None and primary.base_tier == "intern":
            return "intern"
        if "hr_admin" in tiers:
            return "hr"
        return "employee"

    if person_id == FOUNDER_PERSON_ID:
        return "founder"
    if primary is not None and primary.level == 4:
        return "intern"
    if any(_is_hr_role(r) for r in roles_of_person):
        return "hr"
    return "employee"


def _reports_under(person_id: str, roles_of_person: list[Role], all_roles: list[Role], edges: list[Edge]) -> list[str]:
    """Every person who (transitively) reports to `person_id` via reports_to edges,
    walked role-by-role then mapped back to people. Empty until edges are authored."""
    seen: set[str] = set()
    stack = [r.id for r in roles_of_person]
    while stack:
        current = stack.pop()
        for edge in edges:
            if edge.type == "reports_to" and edge.to_role_id == current and edge.from_role_id not in seen:
                seen.add(edge.from_role_id)
                stack.append(edge.from_role_id)
    return list({r.person_id for r in all_roles if r.id in seen and r.person_id})


def _resolve_from(
    email: str, person: Person, unit_name_of: dict, root_unit: str,
    primary: Role | None, roles_of_person: list[Role], all_roles: list[Role], edges: list[Edge],
) -> AccessProfile:
    tier = _tier_of(person.id, primary, roles_of_person)
    visible: list[str] | Literal["all"]
    if tier in ("founder", "hr"):
        visible = "all"
    else:
        visible = [person.id, *_reports_under(person.id, roles_of_person, all_roles, edges)]
    department = "Executive" if primary and primary.unit_id == root_unit else (unit_name_of.get(primary.unit_id) if primary else None)
    return AccessProfile(
        person_id=person.id, display_name=person.display_name, email=email.lower(),
        role_title=primary.title if primary else None, department=department,
        tier=tier, can_edit_structure=tier in ("founder", "hr"), visible_person_ids=visible,
    )


def resolve_access(email: str) -> AccessProfile | None:
    """The single place that turns 'this verified email' into 'what this person is
    allowed to see' — every protected endpoint should go through this, not roll its
    own role check."""
    email = email.lower()

    if postgres_configured():
        from . import org_pg  # deferred: no database import when unconfigured
        person_id = org_pg.person_id_for_email(email)
        if person_id is None:
            return None
        snap = org_pg.get_snapshot()
        person = snap.person_by_id(person_id)
        if person is None:
            return None
        return _resolve_from(
            email, person, {u.id: u.name for u in snap.units}, org_pg.ROOT_UNIT,
            snap.primary_role_of(person_id), snap.roles_of(person_id), snap.roles, snap.edges,
        )

    if firestore_configured():
        from . import org_repo  # deferred: avoids importing Firestore when unconfigured
        person_id = org_repo.person_id_for_email(email)
        if person_id is None:
            return None
        snap = org_repo.get_snapshot()
        person = snap.person_by_id(person_id)
        if person is None:
            return None
        primary = snap.primary_role_of(person_id)
        roles_of_person = snap.roles_of(person_id)
        unit_name_of = {u.id: u.name for u in snap.units}
        return _resolve_from(email, person, unit_name_of, org_repo.ROOT_UNIT, primary, roles_of_person, snap.roles, snap.edges)

    person_id = org_data.PERSON_ID_BY_EMAIL.get(email)
    if person_id is None:
        return None
    person = org_data.PERSON_BY_ID[person_id]
    primary = org_data.primary_role_of(person_id)
    roles_of_person = org_data.roles_of(person_id)
    unit_name_of = {u.id: u.name for u in org_data.UNITS}
    return _resolve_from(email, person, unit_name_of, org_data.ROOT_UNIT, primary, roles_of_person, org_data.ROLES, org_data.EDGES)
