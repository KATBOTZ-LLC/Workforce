"""DEV-ONLY sign-in. Off unless WF_DEV_LOGIN=1 is set explicitly.

Why this exists: real sign-in is Google Identity Services, which needs an OAuth
client id from the KATBOTZ Google Cloud console. Until that exists there is no
way to obtain a session token in a browser, and therefore no way to see the
frontend read the database. This endpoint closes that gap and nothing else.

Deliberate limits, so it cannot become a back door:
  * It returns 404 unless WF_DEV_LOGIN=1. In any deployment that flag is absent,
    so the route does not exist at all — not merely "returns 403".
  * It will only issue a token for an email that already exists in PERSON_EMAIL.
    It cannot invent an identity, and it grants no tier of its own: access is
    still resolved from the org chart by access.py on every request.
  * Tokens last one hour and carry dev=True, so they are identifiable in logs.
  * If WF_DEV_LOGIN_PASSCODE is set, every call must present it. SET THIS
    whenever the app is reachable from outside your own machine — over a tunnel
    or any public URL. Without it, anyone holding the URL can sign in as the
    founder and read every name and address in the directory.

DO NOT set WF_DEV_LOGIN in staging or production. Delete this module once the
Google OAuth client id is configured.
"""

import datetime
import hmac
import os

import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import db
from .config import settings

router = APIRouter(prefix="/api/dev", tags=["dev"])


def dev_login_enabled() -> bool:
    return os.environ.get("WF_DEV_LOGIN") == "1"


def _passcode() -> str | None:
    code = os.environ.get("WF_DEV_LOGIN_PASSCODE", "").strip()
    return code or None


def _check_passcode(supplied: str | None) -> None:
    expected = _passcode()
    if expected is None:
        return
    # compare_digest, not ==, so a wrong guess takes the same time as a right
    # one and cannot be narrowed down character by character.
    if supplied is None or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Wrong passcode")


class DevLoginRequest(BaseModel):
    email: str
    passcode: str | None = None


class DevLoginResponse(BaseModel):
    session_token: str
    email: str


@router.post("/login", response_model=DevLoginResponse)
def dev_login(payload: DevLoginRequest) -> DevLoginResponse:
    if not dev_login_enabled():
        raise HTTPException(status_code=404, detail="Not found")
    if not db.postgres_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    _check_passcode(payload.passcode)

    email = payload.email.strip().lower()
    # The address must already be a known worker address. This endpoint issues a
    # session for an existing identity; it never creates one.
    known = db.one(
        "SELECT 1 AS ok FROM person_email WHERE lower(email) = :email", email=email
    )
    if known is None:
        raise HTTPException(status_code=403, detail=f"{email} is not a known worker address")

    token = jwt.encode(
        {
            "sub": email,
            "dev": True,
            "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
        },
        settings.session_secret,
        algorithm="HS256",
    )
    return DevLoginResponse(session_token=token, email=email)


class DevWhoAmIResponse(BaseModel):
    enabled: bool
    passcode_required: bool
    emails: list[str]


@router.get("/emails", response_model=DevWhoAmIResponse)
def dev_emails(passcode: str | None = None) -> DevWhoAmIResponse:
    """The worker addresses available to sign in as, so the dev sign-in screen can
    offer a list instead of asking someone to guess.

    When a passcode is required, the address list is withheld until it is given —
    the list is 34 real names and email addresses, so it is not something to
    hand out to anyone who loads the page.
    """
    if not dev_login_enabled():
        raise HTTPException(status_code=404, detail="Not found")

    required = _passcode() is not None
    if required and (passcode is None or not hmac.compare_digest(passcode, _passcode() or "")):
        return DevWhoAmIResponse(enabled=True, passcode_required=True, emails=[])

    return DevWhoAmIResponse(
        enabled=True,
        passcode_required=required,
        emails=[r["email"] for r in db.rows(
            "SELECT email FROM person_email ORDER BY email"
        )],
    )
