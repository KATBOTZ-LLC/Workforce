-- =====================================================================
-- Module 2 · Onboarding and documents
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- ONBOARDING_TOKEN — The tokenized link sent to a candidate.
-- Current state
CREATE TABLE onboarding_token (
    token_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    token_hash                       text NOT NULL,
    issued_at                        timestamptz NOT NULL,
    expires_at                       timestamptz NOT NULL,
    status                           text NOT NULL,
    reissued_from_token_id           uuid
);

-- DOCUMENT_REQUIREMENT — The checklist definition — which documents apply to which kind of worker.
-- Current state
CREATE TABLE document_requirement (
    requirement_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_type                      text,
    region                           text,
    contractor_mode                  text,
    document_name                    text NOT NULL,
    is_mandatory                     boolean NOT NULL,
    validity_months                  integer
);

-- WORKER_DOCUMENT — One checklist item for one engagement, and where it stands.
-- Current state
CREATE TABLE worker_document (
    document_id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    requirement_id                   uuid NOT NULL,
    is_mandatory                     boolean NOT NULL,
    status                           text NOT NULL,
    current_file_id                  uuid,
    expiry_date                      date
);

-- DOCUMENT_FILE — One uploaded file, with the decision made on it.
-- HISTORICAL — a rejected-then-reuploaded document keeps both files and both decisions
CREATE TABLE document_file (
    file_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id                      uuid NOT NULL,
    file_storage_key                 text NOT NULL,
    file_name                        text NOT NULL,
    uploaded_at                      timestamptz NOT NULL,
    scan_state                       text NOT NULL,
    review_status                    text,
    rejection_reason                 text,
    reviewed_by_person_id            uuid,
    reviewed_at                      timestamptz
);

-- DOCUMENT_ACCESS_LOG — Who viewed or downloaded a document.
-- HISTORICAL — append-only
CREATE TABLE document_access_log (
    access_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id                          uuid NOT NULL,
    actor_person_id                  uuid NOT NULL,
    action                           text NOT NULL,
    occurred_at                      timestamptz NOT NULL DEFAULT now()
);
