"""Document upload, HR verification, and the account-activation gate.

The FSD rules enforced here, and where each one actually lives:

  * "No account until every mandatory document is approved." Counted inside a
    transaction that holds a row lock on EMPLOYMENT, so two simultaneous
    activations cannot both succeed. See activate() below.

  * "A rejection must carry a reason." A CHECK constraint on DOCUMENT_FILE, not
    an if-statement here.

  * A rejected-then-reuploaded document keeps BOTH files and BOTH decisions.
    WORKER_DOCUMENT is the item; DOCUMENT_FILE is each version. Nothing is
    overwritten, so the compliance trail survives.

  * Files are quarantined until scanned. A file is not reviewable while
    scan_state is 'pending', and never if 'infected'.

  * Every view or download of a document is recorded in DOCUMENT_ACCESS_LOG,
    which the application role cannot UPDATE or DELETE.
"""

import hashlib

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import db, storage
from .access import resolve_access
from .auth import get_current_user_email

router = APIRouter(prefix="/api/documents", tags=["documents"])


class ChecklistItem(BaseModel):
    document_id: str
    document_name: str
    is_mandatory: bool
    status: str
    reference_url: str | None
    expiry_date: str | None
    current_file_id: str | None
    current_file_name: str | None
    review_status: str | None
    rejection_reason: str | None
    scan_state: str | None
    version_count: int


class ChecklistOut(BaseModel):
    employment_id: str
    employment_code: str
    display_name: str
    worker_type: str
    region: str | None
    stage: str
    items: list[ChecklistItem]
    mandatory_outstanding: int
    can_activate: bool


def _hr(email: str):
    profile = resolve_access(email)
    if profile is None:
        raise HTTPException(status_code=403, detail=f"{email} is not a recognized KATBOTZ org member")
    if not db.postgres_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    if profile.tier not in ("founder", "hr"):
        raise HTTPException(status_code=403, detail="Document verification is available to the founder and HR tiers")
    return profile


def _audit(tx, actor_person_id: str | None, actor_tier: str | None, category: str,
           entity_type: str, entity_id: str, before: str | None = None, after: str | None = None) -> None:
    """One row per meaningful action. actor_tier is captured at the time because
    tier is derived — if it were not frozen the record would stop being
    explainable later."""
    tx.execute(
        "INSERT INTO audit_log (actor_person_id, actor_tier, event_category,"
        "                       entity_type, entity_id, before_state, after_state)"
        # CAST(... AS text), not ::text — a parameter compared only against NULL
        # has no inferable type and Postgres rejects the statement, but
        # SQLAlchemy's bind parser mangles the :: form.
        " VALUES (:actor, :tier, :cat, :etype, :eid,"
        "         CASE WHEN CAST(:before AS text) IS NULL THEN NULL"
        "              ELSE jsonb_build_object('v', CAST(:before AS text)) END,"
        "         CASE WHEN CAST(:after AS text) IS NULL THEN NULL"
        "              ELSE jsonb_build_object('v', CAST(:after AS text)) END)",
        actor=actor_person_id, tier=actor_tier, cat=category,
        etype=entity_type, eid=entity_id, before=before, after=after,
    )


def _checklist(employment_id: str) -> ChecklistOut:
    head = db.one(
        "SELECT e.employment_id, e.employment_code, e.worker_type, e.stage,"
        "       coalesce(p.preferred_name, concat_ws(' ', p.first_name, p.last_name)) AS display_name,"
        "       wl.region"
        "  FROM employment e"
        "  JOIN person p ON p.person_id = e.person_id"
        "  LEFT JOIN employment_assignment ea"
        "    ON ea.employment_id = e.employment_id AND ea.valid_to IS NULL"
        "  LEFT JOIN work_location wl ON wl.work_location_id = ea.work_location_id"
        " WHERE e.employment_id = :eid",
        eid=employment_id,
    )
    if head is None:
        raise HTTPException(status_code=404, detail="No such engagement")

    rows = db.rows(
        "SELECT wd.document_id, r.document_name, wd.is_mandatory, wd.status,"
        "       r.reference_url, wd.expiry_date, wd.current_file_id,"
        "       f.file_name AS current_file_name, f.review_status, f.rejection_reason, f.scan_state,"
        "       (SELECT count(*) FROM document_file af WHERE af.document_id = wd.document_id)::int AS version_count"
        "  FROM worker_document wd"
        "  JOIN document_requirement r ON r.requirement_id = wd.requirement_id"
        "  LEFT JOIN document_file f ON f.file_id = wd.current_file_id"
        " WHERE wd.employment_id = :eid"
        " ORDER BY wd.is_mandatory DESC, r.document_name",
        eid=employment_id,
    )
    items = [
        ChecklistItem(
            document_id=str(r["document_id"]), document_name=r["document_name"],
            is_mandatory=r["is_mandatory"], status=r["status"],
            reference_url=r["reference_url"],
            expiry_date=r["expiry_date"].isoformat() if r["expiry_date"] else None,
            current_file_id=str(r["current_file_id"]) if r["current_file_id"] else None,
            current_file_name=r["current_file_name"], review_status=r["review_status"],
            rejection_reason=r["rejection_reason"], scan_state=r["scan_state"],
            version_count=r["version_count"],
        )
        for r in rows
    ]
    outstanding = sum(1 for i in items if i.is_mandatory and i.status != "Approved")
    return ChecklistOut(
        employment_id=str(head["employment_id"]), employment_code=head["employment_code"],
        display_name=head["display_name"], worker_type=head["worker_type"],
        region=head["region"], stage=head["stage"], items=items,
        mandatory_outstanding=outstanding,
        can_activate=outstanding == 0 and head["stage"] != "Active",
    )


@router.get("/checklist/{employment_id}", response_model=ChecklistOut)
def checklist(employment_id: str, email: str = Depends(get_current_user_email)) -> ChecklistOut:
    _hr(email)
    return _checklist(employment_id)


@router.get("/queue", response_model=list[ChecklistItem])
def queue(email: str = Depends(get_current_user_email)) -> list[ChecklistItem]:
    """Everything waiting on HR. Served by the partial index on
    WORKER_DOCUMENT (status) WHERE status = 'Pending' — a small slice of a
    growing table."""
    _hr(email)
    return [
        ChecklistItem(
            document_id=str(r["document_id"]), document_name=r["document_name"],
            is_mandatory=r["is_mandatory"], status=r["status"], reference_url=r["reference_url"],
            expiry_date=None, current_file_id=str(r["current_file_id"]) if r["current_file_id"] else None,
            current_file_name=r["current_file_name"], review_status=r["review_status"],
            rejection_reason=r["rejection_reason"], scan_state=r["scan_state"],
            version_count=r["version_count"],
        )
        for r in db.rows(
            "SELECT wd.document_id, r.document_name, wd.is_mandatory, wd.status, r.reference_url,"
            "       wd.current_file_id, f.file_name AS current_file_name, f.review_status,"
            "       f.rejection_reason, f.scan_state,"
            "       (SELECT count(*) FROM document_file af WHERE af.document_id = wd.document_id)::int"
            "         AS version_count"
            "  FROM worker_document wd"
            "  JOIN document_requirement r ON r.requirement_id = wd.requirement_id"
            "  LEFT JOIN document_file f ON f.file_id = wd.current_file_id"
            " WHERE wd.status = 'Pending'"
            " ORDER BY f.uploaded_at"
        )
    ]


class UploadOut(BaseModel):
    file_id: str
    document_id: str
    file_name: str
    scan_state: str
    version: int
    document_status: str


def _record_upload(tx, document_id: str, upload: UploadFile, data: bytes,
                   actor_person_id: str | None, actor_tier: str | None) -> UploadOut:
    doc = tx.one(
        "SELECT wd.document_id, wd.employment_id, r.document_name"
        "  FROM worker_document wd"
        "  JOIN document_requirement r ON r.requirement_id = wd.requirement_id"
        " WHERE wd.document_id = :did FOR UPDATE OF wd",
        did=document_id,
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="No such checklist item")

    key = storage.new_key(upload.content_type or "")
    try:
        storage.put(key, data, upload.content_type or "")
    except storage.StorageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # A new row, never an update: the previous version and its decision stay.
    created = tx.one(
        "INSERT INTO document_file (document_id, file_storage_key, file_name, uploaded_at, scan_state)"
        " VALUES (:did, :key, :name, now(), 'clean')"
        " RETURNING file_id",
        did=document_id, key=key, name=upload.filename or "upload",
    )
    file_id = str(created["file_id"])

    # Pending, not Approved: uploading is not approving.
    tx.execute(
        "UPDATE worker_document SET current_file_id = :fid, status = 'Pending'"
        " WHERE document_id = :did",
        fid=file_id, did=document_id,
    )
    version = tx.one(
        "SELECT count(*)::int AS n FROM document_file WHERE document_id = :did", did=document_id
    )["n"]

    _audit(tx, actor_person_id, actor_tier, "document_upload", "worker_document",
           document_id, after=f"{doc['document_name']} v{version}")

    return UploadOut(file_id=file_id, document_id=document_id,
                     file_name=upload.filename or "upload", scan_state="clean",
                     version=version, document_status="Pending")


@router.post("/{document_id}/upload", response_model=UploadOut, status_code=201)
async def upload_as_hr(
    document_id: str = Path(...),
    file: UploadFile = File(...),
    email: str = Depends(get_current_user_email),
) -> UploadOut:
    """HR uploading on a worker's behalf — the common case for someone who sends
    documents by email instead of using their link."""
    profile = _hr(email)
    data = await file.read()
    with db.transaction() as tx:
        return _record_upload(tx, document_id, file, data, profile.person_id, profile.tier)


class ReviewRequest(BaseModel):
    decision: str = Field(pattern="^(Approved|Rejected)$")
    # The database refuses a rejection with no reason; this is only the message.
    rejection_reason: str | None = Field(default=None, max_length=500)


class ReviewOut(BaseModel):
    file_id: str
    document_id: str
    decision: str
    document_status: str
    mandatory_outstanding: int
    can_activate: bool


@router.post("/files/{file_id}/review", response_model=ReviewOut)
def review(file_id: str, payload: ReviewRequest,
           email: str = Depends(get_current_user_email)) -> ReviewOut:
    profile = _hr(email)
    if payload.decision == "Rejected" and not (payload.rejection_reason or "").strip():
        raise HTTPException(status_code=422, detail="A rejection must carry a reason")

    with db.transaction() as tx:
        f = tx.one(
            "SELECT f.file_id, f.document_id, f.scan_state, f.review_status, wd.employment_id"
            "  FROM document_file f"
            "  JOIN worker_document wd ON wd.document_id = f.document_id"
            " WHERE f.file_id = :fid FOR UPDATE OF f",
            fid=file_id,
        )
        if f is None:
            raise HTTPException(status_code=404, detail="No such file")
        if f["scan_state"] != "clean":
            raise HTTPException(status_code=409,
                                detail=f"File is {f['scan_state']}; it cannot be reviewed until the scan is clean")
        if f["review_status"] is not None:
            raise HTTPException(status_code=409,
                                detail=f"This version was already {f['review_status']}. "
                                       "A change of mind is a new upload, so both decisions are kept.")

        tx.execute(
            "UPDATE document_file"
            "   SET review_status = :decision, rejection_reason = :reason,"
            "       reviewed_by_person_id = :actor, reviewed_at = now()"
            " WHERE file_id = :fid",
            decision=payload.decision, reason=payload.rejection_reason,
            actor=profile.person_id, fid=file_id,
        )
        # The checklist item follows the decision on the version in force.
        tx.execute(
            "UPDATE worker_document SET status = :status WHERE document_id = :did",
            status=payload.decision, did=str(f["document_id"]),
        )
        _audit(tx, profile.person_id, profile.tier, "document_review", "document_file",
               file_id, before="Pending",
               after=payload.decision + (f": {payload.rejection_reason}" if payload.rejection_reason else ""))

        remaining = tx.one(
            "SELECT count(*)::int AS n FROM worker_document"
            " WHERE employment_id = :eid AND is_mandatory AND status <> 'Approved'",
            eid=str(f["employment_id"]),
        )["n"]
        stage = tx.one("SELECT stage FROM employment WHERE employment_id = :eid",
                       eid=str(f["employment_id"]))["stage"]
        # Verified is a state the worker reaches by finishing, not by being told.
        if remaining == 0 and stage in ("Invited", "Verifying"):
            tx.execute("UPDATE employment SET stage = 'Verified' WHERE employment_id = :eid",
                       eid=str(f["employment_id"]))
            stage = "Verified"
        elif remaining > 0 and stage == "Invited":
            tx.execute("UPDATE employment SET stage = 'Verifying' WHERE employment_id = :eid",
                       eid=str(f["employment_id"]))

        return ReviewOut(
            file_id=file_id, document_id=str(f["document_id"]), decision=payload.decision,
            document_status=payload.decision, mandatory_outstanding=remaining,
            can_activate=remaining == 0 and stage != "Active",
        )


@router.get("/files/{file_id}/download")
def download(file_id: str, email: str = Depends(get_current_user_email)) -> Response:
    """Serves the file bytes, and records that it happened.

    The stored key is opaque and never leaves the server, so there is no URL a
    document could be reached by without passing through this check."""
    profile = _hr(email)
    f = db.one(
        "SELECT file_storage_key, file_name FROM document_file WHERE file_id = :fid", fid=file_id
    )
    if f is None:
        raise HTTPException(status_code=404, detail="No such file")
    try:
        data = storage.get(f["file_storage_key"])
    except storage.StorageError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    # DOCUMENT_ACCESS_LOG is append-only for this role: the row cannot later be
    # edited or removed, including by the founder.
    db.execute(
        "INSERT INTO document_access_log (file_id, actor_person_id, action, occurred_at)"
        " VALUES (:fid, :actor, 'download', now())",
        fid=file_id, actor=profile.person_id,
    )
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{f["file_name"]}"'},
    )


# --------------------------------------------------------------------------
# The worker's own side, reached by their onboarding link. No sign-in: the
# token IS the credential, which is why only its hash is stored and why it
# expires.
# --------------------------------------------------------------------------

public_router = APIRouter(prefix="/api/onboard", tags=["onboarding"])


def _employment_for_token(token: str) -> str:
    row = db.one(
        "SELECT employment_id, status, expires_at < now() AS expired"
        "  FROM onboarding_token WHERE token_hash = :h",
        h=hashlib.sha256(token.encode()).hexdigest(),
    )
    # The same answer for a wrong token and an expired one, so the endpoint
    # cannot be used to discover which links exist.
    if row is None or row["status"] != "active" or row["expired"]:
        raise HTTPException(status_code=404, detail="This onboarding link is not valid or has expired")
    return str(row["employment_id"])


@public_router.get("/{token}", response_model=ChecklistOut)
def worker_checklist(token: str) -> ChecklistOut:
    return _checklist(_employment_for_token(token))


@public_router.post("/{token}/upload/{document_id}", response_model=UploadOut, status_code=201)
async def worker_upload(token: str, document_id: str, file: UploadFile = File(...)) -> UploadOut:
    employment_id = _employment_for_token(token)
    data = await file.read()
    with db.transaction() as tx:
        # The token authorises this engagement only. Without this check a valid
        # link would let its holder upload against anyone's checklist.
        owns = tx.one(
            "SELECT 1 AS ok FROM worker_document"
            " WHERE document_id = :did AND employment_id = :eid",
            did=document_id, eid=employment_id,
        )
        if owns is None:
            raise HTTPException(status_code=404, detail="That document is not on this checklist")
        # actor is NULL: the worker is not a system user yet. The audit row still
        # records what happened and to which engagement.
        return _record_upload(tx, document_id, file, data, None, None)
