-- =====================================================================
-- Module 3 · Immigration records and compliance
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- VISA_RECORD — A visa held by a person. Never edited — a change supersedes.
-- HISTORICAL — supersession chain; nothing is overwritten
CREATE TABLE visa_record (
    visa_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    visa_type                        text NOT NULL,
    issuing_country                  text NOT NULL,
    valid_from                       date NOT NULL,
    valid_to                         date,
    status                           text NOT NULL,
    superseded_by_visa_id            uuid
);

-- WORK_AUTHORIZATION — The right to work, its duration and its restrictions.
-- HISTORICAL — supersession chain
CREATE TABLE work_authorization (
    auth_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    visa_id                          uuid,
    auth_type                        text NOT NULL,
    valid_from                       date NOT NULL,
    valid_to                         date,
    duration_type                    text,
    prohibits_unpaid_work            boolean NOT NULL,
    restrictions                     text,
    status                           text NOT NULL,
    superseded_by_auth_id            uuid
);

-- COMPLIANCE_EXCEPTION — A raised problem that blocks dependent engagements until cleared.
-- HISTORICAL — cleared exceptions are retained as evidence
CREATE TABLE compliance_exception (
    exception_id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    reason                           text NOT NULL,
    raised_at                        timestamptz NOT NULL,
    cleared_at                       timestamptz
);

-- EXPIRY_ALERT — An alert already sent. The row existing is what stops the scan resending it.
-- HISTORICAL — append-only; this is the idempotency ledger
CREATE TABLE expiry_alert (
    alert_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_id                          uuid,
    work_authorization_id            uuid,
    document_id                      uuid,
    threshold_days                   integer NOT NULL,
    alerted_at                       timestamptz NOT NULL,
    message_status                   text NOT NULL
);
