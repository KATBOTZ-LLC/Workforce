import logging
import time

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.cloud import firestore
from google.oauth2 import id_token
from pydantic import BaseModel

from .config import settings
from .firestore_client import firestore_configured, get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)

SESSION_TTL_SECONDS = 8 * 60 * 60  # 8-hour session, matches the original spec


class GoogleLoginRequest(BaseModel):
    id_token: str


class SessionResponse(BaseModel):
    session_token: str
    email: str
    name: str
    picture: str | None = None


@router.post("/google", response_model=SessionResponse)
def login_with_google(payload: GoogleLoginRequest) -> SessionResponse:
    """Verify a Google Identity Services ID token and issue our own session token.

    This is the real replacement for the frontend's old `?role=admin` /
    `?role=employee` URL param, which the audit found trusted whatever the URL said
    with zero verification — anyone could grant themselves admin by editing the
    address bar. Only verified @katbotz.com Google accounts are accepted here.
    """
    try:
        claims = id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}") from exc

    email = claims.get("email", "")
    hosted_domain = claims.get("hd", "")
    if hosted_domain != settings.allowed_domain and not email.endswith(f"@{settings.allowed_domain}"):
        raise HTTPException(status_code=403, detail=f"Only @{settings.allowed_domain} accounts may sign in")
    if not claims.get("email_verified"):
        raise HTTPException(status_code=403, detail="Google account email is not verified")

    # Best-effort activity log — Firestore needs a GCP billing account that isn't set
    # up yet. Login must keep working without it; this is a nice-to-have record, not
    # part of the security boundary (that's the Google token verification above).
    if firestore_configured():
        try:
            get_db().collection("users").document(email).set(
                {
                    "email": email,
                    "name": claims.get("name", ""),
                    "picture": claims.get("picture"),
                    "last_login": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )
        except Exception:
            logger.warning("Could not write login record to Firestore for %s", email, exc_info=True)
    else:
        logger.info("Firestore not configured — skipping login record for %s", email)

    now = int(time.time())
    session_token = jwt.encode(
        {"sub": email, "iat": now, "exp": now + SESSION_TTL_SECONDS},
        settings.session_secret,
        algorithm="HS256",
    )
    return SessionResponse(
        session_token=session_token,
        email=email,
        name=claims.get("name", ""),
        picture=claims.get("picture"),
    )


def get_current_user_email(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Dependency for protected routes — verifies OUR session token (issued above),
    not a Google token. Every access-controlled endpoint should depend on this rather
    than trusting anything the client claims about its own identity or role."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing session token")
    try:
        claims = jwt.decode(credentials.credentials, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {exc}") from exc
    return claims["sub"]
