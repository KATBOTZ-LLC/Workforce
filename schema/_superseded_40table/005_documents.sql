-- WF-001 — 005 document checklist, upload, verification
SET search_path = wf, public;

-- The checklist catalogue. Requirements are configuration, not code (FSD section 4, Open Item 7).
CREATE TABLE document_requirement (
  code            text PRIMARY KEY,
  label           text NOT NULL,
  applies_type    worker_type,          -- NULL = every type
  applies_region  text,                 -- NULL = every region
  applies_mode    text,                 -- NULL = every contractor mode
  is_mandatory    boolean NOT NULL DEFAULT true,
  allowed_types   text[]  NOT NULL,     -- e.g. {application/pdf,image/jpeg,image/png}
  max_bytes       integer NOT NULL CHECK (max_bytes > 0),
  validity_months integer,              -- e.g. 12 for the US tax withholding form
  active          boolean NOT NULL DEFAULT true
);

-- One row per worker per required document, created when the worker is created.
CREATE TABLE worker_document (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id          text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  requirement_code   text NOT NULL REFERENCES document_requirement(code) ON DELETE RESTRICT,
  is_mandatory       boolean NOT NULL,          -- frozen at creation; later config changes do not move the gate
  status             document_status NOT NULL DEFAULT 'outstanding',
  current_version_id uuid,                      -- FK added after document_version exists
  valid_until        date,
  UNIQUE (worker_id, requirement_code)
);
CREATE INDEX worker_document_queue ON worker_document (status) WHERE status = 'pending';
CREATE INDEX worker_document_gate  ON worker_document (worker_id) WHERE is_mandatory AND status <> 'approved';

CREATE TABLE document_version (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES worker_document(id) ON DELETE CASCADE,
  object_key    text NOT NULL UNIQUE,      -- gs://bucket/worker/<uuid>/<type>/<uuid> — no PII in the path
  file_name     text NOT NULL,
  byte_size     bigint NOT NULL CHECK (byte_size > 0),
  content_type  text NOT NULL,             -- verified against the bytes, not the extension
  sha256        bytea NOT NULL,
  scan_state    scan_status NOT NULL DEFAULT 'pending',
  scanned_at    timestamptz,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  uploaded_by   text
);
CREATE INDEX document_version_document ON document_version (document_id, uploaded_at DESC);
ALTER TABLE worker_document
  ADD CONSTRAINT worker_document_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES document_version(id) ON DELETE SET NULL;

-- Every approve/reject, kept permanently. A rejection must carry a reason (FSD section 5).
CREATE TABLE document_decision (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES worker_document(id) ON DELETE CASCADE,
  version_id  uuid NOT NULL REFERENCES document_version(id) ON DELETE CASCADE,
  decision    document_status NOT NULL CHECK (decision IN ('approved','rejected')),
  reason      rejection_reason,
  reason_note text,
  decided_by  text NOT NULL,
  decided_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_decision_rejection_needs_reason
    CHECK (decision <> 'rejected' OR reason IS NOT NULL),
  CONSTRAINT document_decision_other_needs_note
    CHECK (reason IS DISTINCT FROM 'other' OR btrim(coalesce(reason_note,'')) <> '')
);

-- Required by FSD section 6: document access and download must be recorded. Append-only (013).
CREATE TABLE document_access_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id  uuid NOT NULL REFERENCES document_version(id) ON DELETE CASCADE,
  actor_email citext NOT NULL,
  action      text NOT NULL CHECK (action IN ('view','download')),
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_access_log_version ON document_access_log (version_id, at DESC);
