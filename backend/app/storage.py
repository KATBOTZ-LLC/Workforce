"""Where uploaded documents actually live.

DOCUMENT_FILE.file_storage_key is deliberately opaque in the schema — it
carries no name, no email and no document number, so a leaked key discloses
nothing and the storage backend is not baked into the database.

This module is the only place that knows what a key means. Today it is a path
under a local directory; set DOCUMENTS_BUCKET and it becomes a Cloud Storage
object name. The schema does not change either way, which is the point.
"""

import os
import secrets
from datetime import date
from pathlib import Path

from .config import settings

# Passports and tax forms. Anything not on this list is refused rather than
# stored and worried about later.
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
}
MAX_BYTES = 15 * 1024 * 1024  # 15 MB


class StorageError(Exception):
    pass


def local_root() -> Path:
    root = Path(os.environ.get("DOCUMENTS_LOCAL_ROOT", ".document-store")).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def using_cloud_storage() -> bool:
    return bool(settings.documents_bucket)


def new_key(content_type: str) -> str:
    """An opaque object name. Nothing in it identifies the worker or the
    document type — only the date, for lifecycle rules, and random bytes."""
    suffix = ALLOWED_TYPES.get(content_type, "")
    return f"{date.today():%Y/%m}/{secrets.token_urlsafe(24)}{suffix}"


def put(key: str, data: bytes, content_type: str) -> None:
    if content_type not in ALLOWED_TYPES:
        raise StorageError(
            f"{content_type} is not an accepted document type. "
            f"Allowed: {', '.join(sorted(ALLOWED_TYPES))}"
        )
    if len(data) > MAX_BYTES:
        raise StorageError(f"File is {len(data) // 1024 // 1024} MB; the limit is {MAX_BYTES // 1024 // 1024} MB")
    if not data:
        raise StorageError("File is empty")

    if using_cloud_storage():
        from google.cloud import storage  # imported lazily: unused locally

        client = storage.Client()
        blob = client.bucket(settings.documents_bucket).blob(key)
        blob.upload_from_string(data, content_type=content_type)
        return

    path = local_root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def get(key: str) -> bytes:
    if using_cloud_storage():
        from google.cloud import storage

        client = storage.Client()
        return client.bucket(settings.documents_bucket).blob(key).download_as_bytes()

    path = (local_root() / key).resolve()
    # A key comes from the database, but resolving it and checking containment
    # means a malformed one cannot read outside the store.
    if not str(path).startswith(str(local_root())):
        raise StorageError("Refusing a storage key that escapes the store")
    if not path.exists():
        raise StorageError("Stored file is missing")
    return path.read_bytes()


def describe() -> str:
    return (f"Cloud Storage bucket {settings.documents_bucket}"
            if using_cloud_storage() else f"local directory {local_root()}")
