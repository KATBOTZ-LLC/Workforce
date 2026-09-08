from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .access import AccessTier, resolve_access
from .auth import get_current_user_email

router = APIRouter(prefix="/api", tags=["me"])


class MeResponse(BaseModel):
    person_id: str
    display_name: str
    email: str
    role_title: str | None
    department: str | None
    tier: AccessTier
    can_edit_structure: bool
    visible_person_ids: list[str] | Literal["all"]


@router.get("/me", response_model=MeResponse)
def me(email: str = Depends(get_current_user_email)) -> MeResponse:
    """Who the caller is and what they're allowed to see — derived fresh from the
    org chart on every call, never from a client-supplied role. A logged-in account
    that doesn't match any org-chart person (by the email convention, until real
    addresses are confirmed) is rejected rather than falling back to some default
    access level."""
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(
            status_code=403,
            detail=f"{email} is signed in but isn't recognized as a KATBOTZ org member",
        )
    return MeResponse(
        person_id=profile.person_id,
        display_name=profile.display_name,
        email=profile.email,
        role_title=profile.role_title,
        department=profile.department,
        tier=profile.tier,
        can_edit_structure=profile.can_edit_structure,
        visible_person_ids=profile.visible_person_ids,
    )
