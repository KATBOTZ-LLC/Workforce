"""Worker + document data layer — Firestore-backed, replacing the relevant slice of
the frontend's workforceStore.tsx + localStorage (worker records and document
verification only; goals/attendance/notes/projects/reviews/feedback/leave are a
separate, not-yet-built slice — see 03-DATABASE.md).

Every guard here mirrors a real bug the earlier code audit found and fixed
client-side (see chat history / git log): duplicate-email prevention, the hrLead
rename cascade, and — the most important one — the mandatory-documents gate on
account creation. All three are re-enforced here because a client-side check is
never the real security boundary; this is.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

from google.cloud import firestore

from .doc_requirements import docs_for
from .firestore_client import get_db

COL_WORKERS = "workers"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_by_email(db, email: str, exclude_id: str | None = None) -> dict | None:
    email = email.lower()
    for doc in db.collection(COL_WORKERS).stream():
        if exclude_id and doc.id == exclude_id:
            continue
        w = doc.to_dict()
        if w.get("personal_email", "").lower() == email or w.get("professional_email", "").lower() == email:
            return {**w, "id": doc.id}
    return None


def list_workers(visible_person_ids: list[str] | Literal["all"]) -> list[dict]:
    """Scoped by each worker's `org_person_id` field (set at creation when the hire
    is linked to an org-chart person), not by the worker document's own id — that id
    is a Firestore auto-id with no relationship to the org person id convention."""
    db = get_db()
    out = []
    for doc in db.collection(COL_WORKERS).stream():
        w = doc.to_dict()
        if visible_person_ids != "all" and w.get("org_person_id") not in visible_person_ids:
            continue
        out.append({**w, "id": doc.id})
    return out


def get_worker(worker_id: str) -> dict | None:
    doc = get_db().collection(COL_WORKERS).document(worker_id).get()
    return {**doc.to_dict(), "id": doc.id} if doc.exists else None


class DuplicateEmailError(Exception):
    def __init__(self, existing: dict):
        self.existing = existing
        super().__init__(f"Email already registered to {existing.get('name')}")


def create_worker(payload: dict) -> dict:
    db = get_db()
    # personal_email is required by the request model; professional_email defaults to
    # firstname.lastname@katbotz.com when omitted, matching employees/page.tsx's
    # submit handler — checked for collisions only once it has a real value either way.
    professional_email = payload.get("professional_email") or (
        f"{payload['first_name']}.{payload['last_name']}".lower().replace(" ", "") + "@katbotz.com"
    )
    for candidate in (payload["personal_email"], professional_email):
        dupe = _find_by_email(db, candidate)
        if dupe:
            raise DuplicateEmailError(dupe)

    doc_ref = db.collection(COL_WORKERS).document()
    worker = {
        **payload,
        "professional_email": professional_email,
        "name": f"{payload['first_name']} {payload['last_name']}".strip(),
        "created_at": _now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "stage": "invited",
        "account_created": False,
        "documents": payload.get("documents") or docs_for(payload["type"], payload.get("location"), payload.get("contractor_mode")),
        "status": payload.get("status", "active"),
    }
    doc_ref.set(worker)
    return {**worker, "id": doc_ref.id}


def update_worker(worker_id: str, patch: dict) -> dict:
    db = get_db()
    doc_ref = db.collection(COL_WORKERS).document(worker_id)
    before_doc = doc_ref.get()
    if not before_doc.exists:
        raise ValueError("worker not found")
    before = before_doc.to_dict()

    # Duplicate-email check applies on edit too — the exact gap the original audit
    # found: the create-time check meant nothing if editing could still collide.
    for field in ("personal_email", "professional_email"):
        if field in patch and patch[field]:
            dupe = _find_by_email(db, patch[field], exclude_id=worker_id)
            if dupe:
                raise DuplicateEmailError(dupe)

    merged = {**before, **patch}
    merged["name"] = f"{merged.get('first_name','')} {merged.get('last_name','')}".strip()
    doc_ref.set(merged)

    # hrLead is a name string, not an id (matches the frontend's own field) — a rename
    # must cascade to everyone who had the OLD name as their hrLead, including the
    # renamed worker's own self-reference, or it silently goes stale.
    if merged["name"] != before.get("name"):
        batch = db.batch()
        for doc in db.collection(COL_WORKERS).stream():
            w = doc.to_dict()
            if w.get("hr_lead") == before.get("name"):
                batch.update(doc.reference, {"hr_lead": merged["name"]})
        batch.commit()

    return {**merged, "id": worker_id}


def verify_document(worker_id: str, doc_key: str) -> dict:
    db = get_db()
    doc_ref = db.collection(COL_WORKERS).document(worker_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("worker not found")
    w = snap.to_dict()
    documents = [
        {**d, "status": "approved", "reason": None} if d["key"] == doc_key else d
        for d in w.get("documents", [])
    ]
    all_approved = all(d.get("mandatory") is False or d["status"] == "approved" for d in documents)
    patch = {"documents": documents}
    if all_approved:
        patch["stage"] = "verified"
    doc_ref.update(patch)
    return {**w, **patch, "id": worker_id}


def reject_document(worker_id: str, doc_key: str, reason: str) -> dict:
    db = get_db()
    doc_ref = db.collection(COL_WORKERS).document(worker_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("worker not found")
    w = snap.to_dict()
    documents = [
        {**d, "status": "rejected", "reason": reason} if d["key"] == doc_key else d
        for d in w.get("documents", [])
    ]
    doc_ref.update({"documents": documents})
    return {**w, "documents": documents, "id": worker_id}


class DocumentsNotVerifiedError(Exception):
    pass


def create_account(worker_id: str) -> dict:
    """The real enforcement point for the account-creation gate — not the frontend's
    disabled button, and not even the frontend reducer's own guard (both are only
    ever advisory once a real backend exists). A worker with any unapproved
    mandatory document can never be activated through this endpoint, full stop."""
    db = get_db()
    doc_ref = db.collection(COL_WORKERS).document(worker_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("worker not found")
    w = snap.to_dict()
    if w.get("account_created"):
        return {**w, "id": worker_id}
    unapproved = [d for d in w.get("documents", []) if d.get("mandatory") is not False and d["status"] != "approved"]
    if unapproved:
        raise DocumentsNotVerifiedError(f"{len(unapproved)} mandatory document(s) not yet approved")
    patch = {"account_created": True, "stage": "active"}
    doc_ref.update(patch)
    return {**w, **patch, "id": worker_id}


def set_employee_status(worker_id: str, status: Literal["active", "inactive"], date_of_exit: str | None) -> dict:
    db = get_db()
    doc_ref = db.collection(COL_WORKERS).document(worker_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("worker not found")
    w = snap.to_dict()
    patch: dict = {"status": status}
    if status == "inactive":
        patch["date_of_exit"] = date_of_exit or datetime.now(timezone.utc).date().isoformat()
    doc_ref.update(patch)
    return {**w, **patch, "id": worker_id}
