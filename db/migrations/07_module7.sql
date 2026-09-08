-- =====================================================================
-- Module 7 · Security and audit
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- USER_ACCOUNT — The sign-in identity. Deliberately separate from the employee record.
-- Current state
CREATE TABLE user_account (
    account_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    email                            text NOT NULL,
    google_subject                   text NOT NULL,
    domain                           text NOT NULL,
    email_verified                   boolean NOT NULL,
    status                           text NOT NULL
);

-- SESSION — One issued session.
-- HISTORICAL — expired and revoked sessions are retained
CREATE TABLE session (
    session_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id                       uuid NOT NULL,
    created_at                       timestamptz NOT NULL DEFAULT now(),
    expires_at                       timestamptz NOT NULL,
    revoked_at                       timestamptz,
    ip_address                       text
);

-- ONE_TIME_CODE — A code issued for step-up verification.
-- HISTORICAL — retained as audit evidence
CREATE TABLE one_time_code (
    otp_id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id                       uuid NOT NULL,
    code_hash                        text NOT NULL,
    purpose                          text NOT NULL,
    created_at                       timestamptz NOT NULL DEFAULT now(),
    expires_at                       timestamptz NOT NULL,
    attempt_count                    integer NOT NULL,
    max_attempts                     integer NOT NULL,
    status                           text NOT NULL
);

-- AUDIT_LOG — Every sensitive action. Append-only for every tier including founder.
-- HISTORICAL — append-only, retained beyond worker retention as proof of deletion
CREATE TABLE audit_log (
    audit_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_person_id                  uuid,
    actor_tier                       text,
    event_category                   text NOT NULL,
    entity_type                      text NOT NULL,
    entity_id                        uuid NOT NULL,
    before_state                     jsonb,
    after_state                      jsonb,
    ip_address                       text,
    occurred_at                      timestamptz NOT NULL DEFAULT now()
);

-- DATA_EXPORT_LOG — Who took data out of the system.
-- HISTORICAL — append-only
CREATE TABLE data_export_log (
    export_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_person_id                  uuid NOT NULL,
    export_type                      text NOT NULL,
    row_count                        integer NOT NULL,
    filter_applied                   jsonb,
    exported_at                      timestamptz NOT NULL
);
