"""Org chart REST API — the real replacement for the frontend's orgStore.tsx +
localStorage. Every mutation requires `can_edit_structure` (founder/hr), enforced
here server-side — not the frontend's client-side-only role check, which anyone
could bypass by editing the URL.

Only available when Firestore is configured (see firestore_client.py) — there's
nothing to persist mutations to otherwise.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import org_repo
from .access import resolve_access
from .auth import get_current_user_email
from .firestore_client import firestore_configured

router = APIRouter(prefix="/api/org", tags=["org"])


def require_edit_structure(email: str = Depends(get_current_user_email)) -> str:
    """Dependency for every mutating route — resolves the caller's real access tier
    and rejects anyone without founder/hr, regardless of what the client claims."""
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(status_code=403, detail=f"{email} isn't recognized as a KATBOTZ org member")
    if not profile.can_edit_structure:
        raise HTTPException(status_code=403, detail=f"{profile.display_name} ({profile.tier}) cannot edit the org structure")
    return profile.display_name  # used as the audit log's `actor`


def _require_firestore() -> None:
    if not firestore_configured():
        raise HTTPException(status_code=503, detail="Firestore isn't configured yet — see backend/README.md")


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

class PersonOut(BaseModel):
    id: str
    display_name: str


class UnitOut(BaseModel):
    id: str
    name: str
    parent_id: str | None


class RoleOut(BaseModel):
    id: str
    person_id: str | None
    unit_id: str
    level: int
    title: str
    is_primary: bool


class EdgeOut(BaseModel):
    id: str
    from_role_id: str
    to_role_id: str
    type: str


class OrgSnapshotOut(BaseModel):
    people: list[PersonOut]
    units: list[UnitOut]
    roles: list[RoleOut]
    edges: list[EdgeOut]


@router.get("", response_model=OrgSnapshotOut)
def get_org(email: str = Depends(get_current_user_email)) -> OrgSnapshotOut:
    _require_firestore()
    org_repo.seed_if_empty()
    snap = org_repo.get_snapshot()
    return OrgSnapshotOut(
        people=[PersonOut(id=p.id, display_name=p.display_name) for p in snap.people],
        units=[UnitOut(id=u.id, name=u.name, parent_id=u.parent_id) for u in snap.units],
        roles=[RoleOut(id=r.id, person_id=r.person_id, unit_id=r.unit_id, level=r.level, title=r.title, is_primary=r.is_primary) for r in snap.roles],
        edges=[EdgeOut(id=e.id, from_role_id=e.from_role_id, to_role_id=e.to_role_id, type=e.type) for e in snap.edges],
    )


class AuditEntryOut(BaseModel):
    id: str
    actor: str
    summary: str
    before: str | None
    after: str | None
    created_at: str | None


@router.get("/audit-log", response_model=list[AuditEntryOut])
def get_audit_log(email: str = Depends(get_current_user_email)) -> list[AuditEntryOut]:
    _require_firestore()
    return [AuditEntryOut(**entry) for entry in org_repo.get_audit_log()]


# ---------------------------------------------------------------------------
# Write — every route below requires can_edit_structure
# ---------------------------------------------------------------------------

class AddPersonIn(BaseModel):
    display_name: str


@router.post("/people", response_model=PersonOut)
def add_person(payload: AddPersonIn, actor: str = Depends(require_edit_structure)) -> PersonOut:
    _require_firestore()
    person_id = org_repo.add_person(payload.display_name, actor)
    return PersonOut(id=person_id, display_name=payload.display_name.strip())


class UpdatePersonIn(BaseModel):
    display_name: str | None = None


@router.patch("/people/{person_id}")
def update_person(person_id: str, payload: UpdatePersonIn, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.update_person(person_id, payload.model_dump(exclude_none=True), actor)
    return {"status": "ok"}


@router.delete("/people/{person_id}")
def delete_person(person_id: str, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.delete_person(person_id, actor)
    return {"status": "ok"}


class AddRoleIn(BaseModel):
    person_id: str | None
    unit_id: str
    level: int
    title: str
    is_primary: bool = False


@router.post("/roles", response_model=RoleOut)
def add_role(payload: AddRoleIn, actor: str = Depends(require_edit_structure)) -> RoleOut:
    _require_firestore()
    role_id = org_repo.add_role(payload.person_id, payload.unit_id, payload.level, payload.title, payload.is_primary, actor)
    return RoleOut(id=role_id, **{**payload.model_dump(), "title": payload.title.strip()})


class UpdateRoleIn(BaseModel):
    person_id: str | None = None
    unit_id: str | None = None
    level: int | None = None
    title: str | None = None


@router.patch("/roles/{role_id}")
def update_role(role_id: str, payload: UpdateRoleIn, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.update_role(role_id, payload.model_dump(exclude_none=True), actor)
    return {"status": "ok"}


@router.delete("/roles/{role_id}")
def delete_role(role_id: str, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.delete_role(role_id, actor)
    return {"status": "ok"}


class AddUnitIn(BaseModel):
    name: str
    parent_id: str | None = None


@router.post("/units", response_model=UnitOut)
def add_unit(payload: AddUnitIn, actor: str = Depends(require_edit_structure)) -> UnitOut:
    _require_firestore()
    unit_id = org_repo.add_unit(payload.name, payload.parent_id, actor)
    return UnitOut(id=unit_id, name=payload.name.strip(), parent_id=payload.parent_id or org_repo.ROOT_UNIT)


class RenameUnitIn(BaseModel):
    name: str


@router.patch("/units/{unit_id}")
def rename_unit(unit_id: str, payload: RenameUnitIn, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.rename_unit(unit_id, payload.name, actor)
    return {"status": "ok"}


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.delete_unit(unit_id, actor)
    return {"status": "ok"}


class AddEdgeIn(BaseModel):
    from_role_id: str
    to_role_id: str
    type: Literal["reports_to", "accountable_to", "dotted"]


@router.post("/edges")
def add_edge(payload: AddEdgeIn, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    edge_id = org_repo.add_edge(payload.from_role_id, payload.to_role_id, payload.type, actor)
    if edge_id is None:
        raise HTTPException(status_code=409, detail="That relationship already exists, or a role can't report to itself")
    return {"id": edge_id}


@router.delete("/edges/{edge_id}")
def delete_edge(edge_id: str, actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.delete_edge(edge_id, actor)
    return {"status": "ok"}


@router.post("/reset")
def reset_to_source(actor: str = Depends(require_edit_structure)) -> dict:
    _require_firestore()
    org_repo.reset_to_source(actor)
    return {"status": "ok"}
