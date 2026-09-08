from google.cloud import firestore

from .config import settings

_db: firestore.Client | None = None


def get_db() -> firestore.Client:
    """Lazily create the Firestore client so import-time (e.g. tests) never needs
    real GCP credentials. Raises if FIRESTORE_PROJECT_ID isn't set — callers that can
    function without Firestore (see auth.py) should check `firestore_configured()`
    first rather than catching this."""
    global _db
    if settings.firestore_project_id is None:
        raise RuntimeError("FIRESTORE_PROJECT_ID is not set")
    if _db is None:
        _db = firestore.Client(project=settings.firestore_project_id)
    return _db


def firestore_configured() -> bool:
    return settings.firestore_project_id is not None
