"""Worker + document REST API. List/get is scoped by the caller's real access
profile (`resolve_access`'s `visible_person_ids`) — an employee/intern only ever
sees themselves (or their reports, once reporting edges exist); founder/hr see
everyone. This is the org-chart-as-access-root design actually applied to real
worker data, not just to the org chart's own admin tooling.

Scoping note: visibility matching relies on an optional `org_person_id` field
linking a worker record to its org-chart person — set at creation when the hire is
already an org-chart member, left unset otherwise. A brand-new hire created here
with no org-chart role yet has no such link — founder/hr can still see and manage
them (that's the whole point of onboarding), but they won't appear in a non-admin's
scoped view until they're actually placed in the org chart. This is a known,
deliberate limitation, not an oversight — see 03-DATABASE.md.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import worker_repo
from .access import resolve_access
from .auth import get_current_user_email

router = APIRouter(prefix="/api/workers", tags=["workers"])


def _current_profile(email: str = Depends(get_current_user_email)):
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(status_code=403, detail=f"{email} isn't recognized as a KATBOTZ org member")
    return profile


def require_hr(profile=Depends(_current_profile)):
    if not profile.can_edit_structure:  # same tiers (founder/hr) as org-structure edits
        raise HTTPException(status_code=403, detail=f"{profile.display_name} ({profile.tier}) cannot manage workers")
    return profile.display_name


class WorkerDocOut(BaseModel):
    key: str
    label: str
    mandatory: bool = True
    link: str | None = None
    file_name: str | None = None
    status: str
    reason: str | None = None
    uploaded_at: str | None = None


class WorkerOut(BaseModel):
    id: str
    org_person_id: str | None = None
    first_name: str
    last_name: str
    name: str
    gender: str
    dob: str | None = None
    about: str | None = None
    personal_email: str
    professional_email: str
    phone: str
    country: str
    state: str
    address: str
    pincode: str
    timezone: str
    type: str
    contractor_mode: str | None = None
    employment_type: str
    designation: str
    department: str
    hr_lead: str
    team_lead_ids: list[str] = []
    location: str
    status: str
    date_of_joining: str
    date_of_exit: str | None = None
    work_experience: str | None = None
    created_at: str
    expires_at: str
    stage: str
    account_created: bool
    documents: list[WorkerDocOut] = []


@router.get("", response_model=list[WorkerOut])
def list_workers(profile=Depends(_current_profile)) -> list[dict]:
    return worker_repo.list_workers(profile.visible_person_ids)


@router.get("/{worker_id}", response_model=WorkerOut)
def get_worker(worker_id: str, profile=Depends(_current_profile)) -> dict:
    w = worker_repo.get_worker(worker_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    visible = profile.visible_person_ids
    if visible != "all" and w.get("org_person_id") not in visible:
        raise HTTPException(status_code=403, detail="Not in your visible scope")
    return w


class CreateWorkerIn(BaseModel):
    first_name: str
    last_name: str
    gender: str = "Prefer not to say"
    personal_email: str
    professional_email: str | None = None
    phone: str = ""
    country: str = "India"
    state: str = ""
    address: str = ""
    pincode: str = ""
    timezone: str = "IST (UTC+5:30)"
    type: Literal["Employee", "Contractor", "Intern"]
    contractor_mode: str | None = None
    employment_type: str = "Full-time"
    designation: str
    department: str
    hr_lead: str = ""
    team_lead_ids: list[str] = []
    location: str = "India"
    date_of_joining: str
    org_person_id: str | None = None


@router.post("", response_model=WorkerOut)
def create_worker(payload: CreateWorkerIn, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.create_worker(payload.model_dump())
    except worker_repo.DuplicateEmailError as e:
        raise HTTPException(status_code=409, detail=f"Email already registered to {e.existing.get('name')}") from e


class UpdateWorkerIn(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    personal_email: str | None = None
    professional_email: str | None = None
    phone: str | None = None
    country: str | None = None
    state: str | None = None
    address: str | None = None
    pincode: str | None = None
    designation: str | None = None
    department: str | None = None
    hr_lead: str | None = None
    team_lead_ids: list[str] | None = None
    location: str | None = None


@router.patch("/{worker_id}", response_model=WorkerOut)
def update_worker(worker_id: str, payload: UpdateWorkerIn, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.update_worker(worker_id, payload.model_dump(exclude_none=True))
    except worker_repo.DuplicateEmailError as e:
        raise HTTPException(status_code=409, detail=f"Email already registered to {e.existing.get('name')}") from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{worker_id}/documents/{doc_key}/verify", response_model=WorkerOut)
def verify_document(worker_id: str, doc_key: str, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.verify_document(worker_id, doc_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


class RejectDocIn(BaseModel):
    reason: str


@router.post("/{worker_id}/documents/{doc_key}/reject", response_model=WorkerOut)
def reject_document(worker_id: str, doc_key: str, payload: RejectDocIn, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.reject_document(worker_id, doc_key, payload.reason)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{worker_id}/create-account", response_model=WorkerOut)
def create_account(worker_id: str, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.create_account(worker_id)
    except worker_repo.DocumentsNotVerifiedError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


class SetStatusIn(BaseModel):
    status: Literal["active", "inactive"]
    date_of_exit: str | None = None


@router.post("/{worker_id}/status", response_model=WorkerOut)
def set_status(worker_id: str, payload: SetStatusIn, actor: str = Depends(require_hr)) -> dict:
    try:
        return worker_repo.set_employee_status(worker_id, payload.status, payload.date_of_exit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
