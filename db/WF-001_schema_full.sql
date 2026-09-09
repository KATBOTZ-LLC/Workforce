-- =====================================================================
-- KATBOTZ Workforce Platform · WF-001
-- Complete database schema, all structural migrations concatenated.
--
-- 37 tables · 269 columns · 54 foreign keys · 48 check constraints
--
-- Generated from WF-001_Schema_Blueprint.docx and verified against a
-- running PostgreSQL 17 instance. This file is for READING and review.
-- To apply the schema, run ./db/migrate.sh — it executes the numbered
-- files in db/migrations/ in order and prints the counts above so they
-- can be checked. ./db/migrate.sh --test then runs 20 rule checks.
--
-- SEED DATA IS DELIBERATELY EXCLUDED. The KATBOTZ org chart and the
-- document requirements live in db/migrations/96_* and 97_*. They are
-- data, not schema, and they contain real names — no reason to
-- duplicate them into a second file.
-- =====================================================================

-- ///////////////////////////////////////////////////////////////////
-- //  00_extensions.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Extensions and the application role.
--
-- Written to work on a local PostgreSQL AND on managed Postgres (Neon,
-- Supabase, Cloud SQL), where the connecting role is usually not a superuser
-- and may not be allowed to create roles at all.
-- =====================================================================

-- gen_random_uuid() is in core PostgreSQL from 13 onward, so pgcrypto is only
-- a fallback for older servers. Not fatal if the platform forbids it.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN insufficient_privilege OR feature_not_supported THEN
    RAISE NOTICE 'pgcrypto not installed (not permitted here). Fine on PostgreSQL 13+.';
END
$$;

-- Required: the directory's misspelling-tolerant search depends on it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- The role the application connects as.
--
-- It deliberately does NOT own the tables. That is the whole mechanism behind
-- the append-only guarantee on the audit tables: 80_security.sql revokes
-- UPDATE and DELETE from this role, and an owner could simply grant them back.
--
-- On a managed platform that forbids CREATE ROLE, this is skipped with a
-- warning rather than failing the migration. The schema still applies; the
-- append-only guarantee does not hold until a separate role exists. See
-- 80_security.sql, which says so again at the point it matters.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wf_app') THEN
        EXECUTE format(
            'CREATE ROLE wf_app LOGIN PASSWORD %L',
            coalesce(nullif(current_setting('wf.app_password', true), ''), 'wf_app_local_dev')
        );
        RAISE NOTICE 'Created role wf_app.';
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Cannot create role wf_app here (not permitted). The schema will '
                  'still apply, but the append-only guarantee on the audit tables '
                  'is NOT in force until the app connects as a non-owning role.';
END
$$;

-- ///////////////////////////////////////////////////////////////////
-- //  01_module1.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 1 · Core identity and org structure
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- DEPARTMENT — One department in the company tree.
-- Current state
CREATE TABLE department (
    department_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                             text NOT NULL,
    parent_department_id             uuid,
    is_root                          boolean NOT NULL,
    is_active                        boolean NOT NULL
);

-- ROLE — One seat in the org chart. Exists whether or not somebody holds it.
-- Current state
CREATE TABLE role (
    role_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                            text NOT NULL,
    department_id                    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    reports_to_role_id               uuid,
    base_tier                        text NOT NULL,
    is_active                        boolean NOT NULL
);

-- PERSON — The human being. Everything that belongs to the person rather than to any engagement.
-- Current state
CREATE TABLE person (
    person_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name                       text NOT NULL,
    last_name                        text,
    preferred_name                   text,
    gender                           text,
    date_of_birth                    date,
    nationality                      text,
    immigration_status               text,
    created_at                       timestamptz NOT NULL DEFAULT now()
);

-- PERSON_ROLE — Which seat a person holds, and when.
-- HISTORICAL — closed by setting valid_to, never overwritten
CREATE TABLE person_role (
    person_role_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    role_id                          uuid NOT NULL,
    is_primary                       boolean NOT NULL,
    valid_from                       date NOT NULL,
    valid_to                         date
);

-- PERSON_EMAIL — Email addresses, held as rows so one constraint enforces the FSD uniqueness rule.
-- Current state
CREATE TABLE person_email (
    email_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    email_type                       text NOT NULL,
    email                            text NOT NULL
);

-- EMPLOYMENT — One engagement of one person. Separate from Person because a person may be engaged more than once.
-- HISTORICAL — a re-engagement is a NEW row; both are retained
CREATE TABLE employment (
    employment_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_code                  text NOT NULL,
    person_id                        uuid NOT NULL,
    worker_type                      text NOT NULL,
    contractor_mode                  text,
    employment_type                  text,
    designation                      text NOT NULL,
    joined_on                        date NOT NULL,
    exited_on                        date,
    stage                            text NOT NULL,
    retention_due_on                 date GENERATED ALWAYS AS (((exited_on + INTERVAL '3 years'))::date) STORED
);

-- EMPLOYMENT_ASSIGNMENT — Where an engagement sits, and under whom. Effective-dated.
-- HISTORICAL — the source of truth for "which department was she in last March"
CREATE TABLE employment_assignment (
    assignment_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    department_id                    uuid NOT NULL,
    hr_lead_person_id                uuid,
    hr_lead_unresolved               text,
    work_location_id                 uuid NOT NULL,
    change_reason                    text,
    valid_from                       date NOT NULL,
    valid_to                         date
);

-- WORK_LOCATION — A place of work, and the region and time zone that follow from it.
-- Current state
CREATE TABLE work_location (
    work_location_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                             text NOT NULL,
    country                          text NOT NULL,
    region                           text NOT NULL,
    timezone                         text NOT NULL
);

-- ///////////////////////////////////////////////////////////////////
-- //  02_module2.sql
-- ///////////////////////////////////////////////////////////////////
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

-- ///////////////////////////////////////////////////////////////////
-- //  03_module3.sql
-- ///////////////////////////////////////////////////////////////////
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

-- ///////////////////////////////////////////////////////////////////
-- //  04_module4.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 4 · Eligibility engine
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- ELIGIBILITY_RULE — One rule. Pure configuration — no legal knowledge is coded into the product.
-- Current state
CREATE TABLE eligibility_rule (
    rule_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country                          text,
    visa_type                        text,
    employment_type                  text,
    paid_or_unpaid                   text,
    effect                           text NOT NULL,
    priority                         integer NOT NULL,
    is_overridable                   boolean NOT NULL,
    rule_set_version                 integer NOT NULL
);

-- ELIGIBILITY_DECISION — One recorded decision, with an immutable copy of what it was based on.
-- HISTORICAL — insert-only; a re-assessment is a new row
CREATE TABLE eligibility_decision (
    decision_id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    rule_set_version                 integer NOT NULL,
    result                           text NOT NULL,
    input_snapshot                   jsonb NOT NULL,
    overridden                       boolean NOT NULL,
    override_reason                  text,
    override_actor_id                uuid,
    override_otp_id                  uuid,
    decided_at                       timestamptz NOT NULL
);

-- ELIGIBILITY_DECISION_RULE — Which rules matched a decision. Every matched reason, not just the winner.
-- HISTORICAL — append-only
CREATE TABLE eligibility_decision_rule (
    id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id                      uuid NOT NULL,
    rule_id                          uuid NOT NULL,
    was_decisive                     boolean NOT NULL
);

-- ///////////////////////////////////////////////////////////////////
-- //  05_module5.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 5 · Attendance and leave
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- ATTENDANCE_RECORD — What one person did on one day.
-- HISTORICAL — accumulates indefinitely, never pruned during employment
CREATE TABLE attendance_record (
    attendance_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    record_date                      date NOT NULL,
    status                           text NOT NULL,
    leave_id                         uuid,
    clock_in_at                      timestamptz,
    clock_out_at                     timestamptz,
    source                           text NOT NULL,
    place                            text
);

-- LEAVE_REQUEST — A request for leave and its decision.
-- HISTORICAL — a decided request is never edited; a change is a new request
CREATE TABLE leave_request (
    leave_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    leave_type                       text NOT NULL,
    category                         text,
    start_date                       date NOT NULL,
    end_date                         date NOT NULL,
    remark                           text,
    status                           text NOT NULL,
    decided_by_person_id             uuid,
    decided_at                       timestamptz
);

-- LEAVE_ENTITLEMENT — How much leave of one category one engagement has, in one year.
-- Current state
CREATE TABLE leave_entitlement (
    entitlement_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    category                         text NOT NULL,
    year                             integer NOT NULL,
    entitled_days                    numeric(10,2),
    accrued_days                     numeric(10,2),
    carried_over_days                numeric(10,2)
);

-- HOLIDAY_CALENDAR — A company holiday, per region. A holiday is not leave.
-- Current state
CREATE TABLE holiday_calendar (
    holiday_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    region                           text NOT NULL,
    holiday_date                     date NOT NULL,
    name                             text NOT NULL
);

-- ///////////////////////////////////////////////////////////////////
-- //  06_module6.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 6 · Performance and milestones
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- PERFORMANCE_REVIEW — One monthly review round for one engagement.
-- HISTORICAL — superseded rounds remain visible
CREATE TABLE performance_review (
    review_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    period_month                     integer NOT NULL,
    period_year                      integer NOT NULL,
    current_stage                    text NOT NULL,
    is_finalized                     boolean NOT NULL,
    supersedes_review_id             uuid
);

-- PERFORMANCE_REVIEW_STAGE — One stage of one review round.
-- HISTORICAL — locked on submission
CREATE TABLE performance_review_stage (
    stage_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id                        uuid NOT NULL,
    stage_name                       text NOT NULL,
    reviewer_person_id               uuid,
    rating                           integer,
    feedback                         text,
    submitted_at                     timestamptz,
    is_locked                        boolean NOT NULL
);

-- MILESTONE_REVIEW — A 30, 60 or 90-day milestone review.
-- Current state
CREATE TABLE milestone_review (
    milestone_id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    milestone_type                   text NOT NULL,
    due_date                         date NOT NULL,
    completed_at                     timestamptz,
    rating                           integer,
    feedback                         text
);

-- ///////////////////////////////////////////////////////////////////
-- //  07_module7.sql
-- ///////////////////////////////////////////////////////////////////
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

-- ///////////////////////////////////////////////////////////////////
-- //  08_module8.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 8 · Tasks and notes
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- TASK — A personal to-do item.
-- Current state
CREATE TABLE task (
    task_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    title                            text NOT NULL,
    description                      text,
    status                           text NOT NULL,
    due_date                         date
);

-- GOAL — A goal set for an engagement.
-- Current state
CREATE TABLE goal (
    goal_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    title                            text NOT NULL,
    description                      text,
    target_date                      date,
    status                           text NOT NULL
);

-- NOTE — A notebook entry.
-- Current state
CREATE TABLE note (
    note_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    content                          text NOT NULL,
    created_at                       timestamptz NOT NULL DEFAULT now()
);

-- ///////////////////////////////////////////////////////////////////
-- //  09_module9.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Module 9 · Data lifecycle
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- MIGRATION_BATCH — One load of external data, with the reconciliation evidence.
-- HISTORICAL — permanent evidence that the load was correct
CREATE TABLE migration_batch (
    batch_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_description               text NOT NULL,
    loaded_by_person_id              uuid NOT NULL,
    source_row_count                 integer NOT NULL,
    loaded_row_count                 integer NOT NULL,
    rejected_row_count               integer NOT NULL,
    hr_signed_off_by_person_id       uuid,
    accepted_at                      timestamptz
);

-- RETENTION_ACTION — Proof that retention deletion happened, and the aggregate that survives it.
-- HISTORICAL — deliberately outlives the data it describes
CREATE TABLE retention_action (
    retention_id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_code                  text NOT NULL,
    worker_type                      text NOT NULL,
    department_name                  text NOT NULL,
    joined_on                        date NOT NULL,
    exited_on                        date,
    documents_deleted                integer NOT NULL,
    executed_at                      timestamptz NOT NULL
);

-- ///////////////////////////////////////////////////////////////////
-- //  50_foreign_keys.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- All 54 foreign keys, in the order the blueprint lists them.
-- Each ON DELETE rule is the approved business policy, not a default.
-- =====================================================================

-- M1: Re-parent children explicitly; a cascade would delete a subtree.
ALTER TABLE department ADD CONSTRAINT fk_department_parent_department_id
    FOREIGN KEY (parent_department_id) REFERENCES department(department_id) ON DELETE RESTRICT;

-- M1: FSD: deleting a department moves its seats to the company root. None are lost.
ALTER TABLE role ADD CONSTRAINT fk_role_department_id
    FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE SET DEFAULT;

-- M1: Retiring a manager seat leaves subordinates unparented rather than deleted.
ALTER TABLE role ADD CONSTRAINT fk_role_reports_to_role_id
    FOREIGN KEY (reports_to_role_id) REFERENCES role(role_id) ON DELETE SET NULL;

-- M1: Who held which seat is permanent.
ALTER TABLE person_role ADD CONSTRAINT fk_person_role_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M1: Seat history must survive the seat being retired.
ALTER TABLE person_role ADD CONSTRAINT fk_person_role_role_id
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT;

-- M1: An address has no meaning without its owner.
ALTER TABLE person_email ADD CONSTRAINT fk_person_email_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE;

-- M1: Retention deletes engagements, never people with remaining history.
ALTER TABLE employment ADD CONSTRAINT fk_employment_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M1: Placements belong to the engagement and go with it at retention.
ALTER TABLE employment_assignment ADD CONSTRAINT fk_employment_assignment_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M1: A department with historical assignments is deactivated, not deleted.
ALTER TABLE employment_assignment ADD CONSTRAINT fk_employment_assignment_department_id
    FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE RESTRICT;

-- M1: The dated row survives; only the pointer thins.
ALTER TABLE employment_assignment ADD CONSTRAINT fk_employment_assignment_hr_lead_person_id
    FOREIGN KEY (hr_lead_person_id) REFERENCES person(person_id) ON DELETE SET NULL;

-- M1: Reference data.
ALTER TABLE employment_assignment ADD CONSTRAINT fk_employment_assignment_work_location_id
    FOREIGN KEY (work_location_id) REFERENCES work_location(work_location_id) ON DELETE RESTRICT;

-- M2: The link exists only for the engagement.
ALTER TABLE onboarding_token ADD CONSTRAINT fk_onboarding_token_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M2: The chain may break; no token is deleted.
ALTER TABLE onboarding_token ADD CONSTRAINT fk_onboarding_token_reissued_from_token_id
    FOREIGN KEY (reissued_from_token_id) REFERENCES onboarding_token(token_id) ON DELETE SET NULL;

-- M2: Checklist belongs to the engagement.
ALTER TABLE worker_document ADD CONSTRAINT fk_worker_document_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M2: A requirement in use is deactivated, never deleted.
ALTER TABLE worker_document ADD CONSTRAINT fk_worker_document_requirement_id
    FOREIGN KEY (requirement_id) REFERENCES document_requirement(requirement_id) ON DELETE RESTRICT;

-- M2: If the current file is purged the item remains, showing no file.
ALTER TABLE worker_document ADD CONSTRAINT fk_worker_document_current_file_id
    FOREIGN KEY (current_file_id) REFERENCES document_file(file_id) ON DELETE SET NULL;

-- M2: Versions belong to the checklist item.
ALTER TABLE document_file ADD CONSTRAINT fk_document_file_document_id
    FOREIGN KEY (document_id) REFERENCES worker_document(document_id) ON DELETE CASCADE;

-- M2: Attribution of an approval is permanent.
ALTER TABLE document_file ADD CONSTRAINT fk_document_file_reviewed_by_person_id
    FOREIGN KEY (reviewed_by_person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M2: Access log follows the file at retention.
ALTER TABLE document_access_log ADD CONSTRAINT fk_document_access_log_file_id
    FOREIGN KEY (file_id) REFERENCES document_file(file_id) ON DELETE CASCADE;

-- M2: Who viewed a passport is permanent.
ALTER TABLE document_access_log ADD CONSTRAINT fk_document_access_log_actor_person_id
    FOREIGN KEY (actor_person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M3: Immigration history is removed only by retention, deliberately.
ALTER TABLE visa_record ADD CONSTRAINT fk_visa_record_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M3: Chain may break; neither record is deleted.
ALTER TABLE visa_record ADD CONSTRAINT fk_visa_record_superseded_by_visa_id
    FOREIGN KEY (superseded_by_visa_id) REFERENCES visa_record(visa_id) ON DELETE SET NULL;

-- M3: As visa.
ALTER TABLE work_authorization ADD CONSTRAINT fk_work_authorization_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M3: An authorization can outlive the visa row it derived from.
ALTER TABLE work_authorization ADD CONSTRAINT fk_work_authorization_visa_id
    FOREIGN KEY (visa_id) REFERENCES visa_record(visa_id) ON DELETE SET NULL;

-- M3: Chain may break; records persist.
ALTER TABLE work_authorization ADD CONSTRAINT fk_work_authorization_superseded_by_auth_id
    FOREIGN KEY (superseded_by_auth_id) REFERENCES work_authorization(auth_id) ON DELETE SET NULL;

-- M3: Belongs to the person.
ALTER TABLE compliance_exception ADD CONSTRAINT fk_compliance_exception_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE;

-- M3: Alerts follow the record they warned about.
ALTER TABLE expiry_alert ADD CONSTRAINT fk_expiry_alert_visa_id
    FOREIGN KEY (visa_id) REFERENCES visa_record(visa_id) ON DELETE CASCADE;

-- M3: As above. Exactly one of the three is set.
ALTER TABLE expiry_alert ADD CONSTRAINT fk_expiry_alert_work_authorization_id
    FOREIGN KEY (work_authorization_id) REFERENCES work_authorization(auth_id) ON DELETE CASCADE;

-- M3: As above.
ALTER TABLE expiry_alert ADD CONSTRAINT fk_expiry_alert_document_id
    FOREIGN KEY (document_id) REFERENCES worker_document(document_id) ON DELETE CASCADE;

-- M4: A recorded decision must not vanish with a tidied engagement.
ALTER TABLE eligibility_decision ADD CONSTRAINT fk_eligibility_decision_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE RESTRICT;

-- M4: Override attribution is permanent.
ALTER TABLE eligibility_decision ADD CONSTRAINT fk_eligibility_decision_override_actor_id
    FOREIGN KEY (override_actor_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M4: The verification that authorised it must stay provable.
ALTER TABLE eligibility_decision ADD CONSTRAINT fk_eligibility_decision_override_otp_id
    FOREIGN KEY (override_otp_id) REFERENCES one_time_code(otp_id) ON DELETE RESTRICT;

-- M4: Reasons belong to the decision.
ALTER TABLE eligibility_decision_rule ADD CONSTRAINT fk_eligibility_decision_rule_decision_id
    FOREIGN KEY (decision_id) REFERENCES eligibility_decision(decision_id) ON DELETE CASCADE;

-- M4: The rule that decided must remain readable. A published rule is never deleted while a decision cites it.
ALTER TABLE eligibility_decision_rule ADD CONSTRAINT fk_eligibility_decision_rule_rule_id
    FOREIGN KEY (rule_id) REFERENCES eligibility_rule(rule_id) ON DELETE RESTRICT;

-- M5: Attendance belongs to the engagement.
ALTER TABLE attendance_record ADD CONSTRAINT fk_attendance_record_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M5: A leave day must always trace to its approved request.
ALTER TABLE attendance_record ADD CONSTRAINT fk_attendance_record_leave_id
    FOREIGN KEY (leave_id) REFERENCES leave_request(leave_id) ON DELETE RESTRICT;

-- M5: Leave belongs to the engagement.
ALTER TABLE leave_request ADD CONSTRAINT fk_leave_request_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M5: Decision timestamp survives; approver pointer may thin.
ALTER TABLE leave_request ADD CONSTRAINT fk_leave_request_decided_by_person_id
    FOREIGN KEY (decided_by_person_id) REFERENCES person(person_id) ON DELETE SET NULL;

-- M5: Balances belong to the engagement.
ALTER TABLE leave_entitlement ADD CONSTRAINT fk_leave_entitlement_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M6: Reviews belong to the engagement.
ALTER TABLE performance_review ADD CONSTRAINT fk_performance_review_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M6: Breaking the chain never deletes the superseded round.
ALTER TABLE performance_review ADD CONSTRAINT fk_performance_review_supersedes_review_id
    FOREIGN KEY (supersedes_review_id) REFERENCES performance_review(review_id) ON DELETE SET NULL;

-- M6: Stages belong to the round.
ALTER TABLE performance_review_stage ADD CONSTRAINT fk_performance_review_stage_review_id
    FOREIGN KEY (review_id) REFERENCES performance_review(review_id) ON DELETE CASCADE;

-- M6: A locked rating stays even if the reviewer record goes.
ALTER TABLE performance_review_stage ADD CONSTRAINT fk_performance_review_stage_reviewer_person_id
    FOREIGN KEY (reviewer_person_id) REFERENCES person(person_id) ON DELETE SET NULL;

-- M6: Belongs to the engagement.
ALTER TABLE milestone_review ADD CONSTRAINT fk_milestone_review_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M7: Unlinking would orphan the audit trail. Disable the account instead.
ALTER TABLE user_account ADD CONSTRAINT fk_user_account_person_id
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M7: Sessions are worthless without the account.
ALTER TABLE session ADD CONSTRAINT fk_session_account_id
    FOREIGN KEY (account_id) REFERENCES user_account(account_id) ON DELETE CASCADE;

-- M7: As sessions.
ALTER TABLE one_time_code ADD CONSTRAINT fk_one_time_code_account_id
    FOREIGN KEY (account_id) REFERENCES user_account(account_id) ON DELETE CASCADE;

-- M7: The event survives; actor_tier and the summary remain.
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_actor_person_id
    FOREIGN KEY (actor_person_id) REFERENCES person(person_id) ON DELETE SET NULL;

-- M7: Who took data out is permanent.
ALTER TABLE data_export_log ADD CONSTRAINT fk_data_export_log_actor_person_id
    FOREIGN KEY (actor_person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M8: Belongs to the engagement.
ALTER TABLE task ADD CONSTRAINT fk_task_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M8: Belongs to the engagement.
ALTER TABLE goal ADD CONSTRAINT fk_goal_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M8: Belongs to the engagement.
ALTER TABLE note ADD CONSTRAINT fk_note_employment_id
    FOREIGN KEY (employment_id) REFERENCES employment(employment_id) ON DELETE CASCADE;

-- M9: Load attribution permanent.
ALTER TABLE migration_batch ADD CONSTRAINT fk_migration_batch_loaded_by_person_id
    FOREIGN KEY (loaded_by_person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- M9: Sign-off attribution permanent.
ALTER TABLE migration_batch ADD CONSTRAINT fk_migration_batch_hr_signed_off_by_person_id
    FOREIGN KEY (hr_signed_off_by_person_id) REFERENCES person(person_id) ON DELETE RESTRICT;

-- ///////////////////////////////////////////////////////////////////
-- //  60_constraints.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Business rules, as constraints. Each block cites the rule it enforces
-- from "The rules, and where each one lives" in the blueprint.
-- =====================================================================

-- Rule: one email identifies one worker — case-insensitive, both types, org-wide.
CREATE UNIQUE INDEX uq_person_email_lower ON person_email (lower(email));
ALTER TABLE person_email ADD CONSTRAINT ck_person_email_type
    CHECK (email_type IN ('personal','professional'));

-- Rule: exactly one root department, and it cannot be deleted.
CREATE UNIQUE INDEX uq_department_single_root ON department (is_root) WHERE is_root;

-- Rule: access tier is read from ROLE.base_tier. Constrained so rules match reliably.
ALTER TABLE role ADD CONSTRAINT ck_role_base_tier
    CHECK (base_tier IN ('founder','hr_admin','employee','intern'));

-- Rule: exactly one current seat (the primary one) per person, and a person
-- cannot currently hold the same seat twice. Concurrent secondary seats are
-- allowed by design — is_primary marks the main one.
CREATE UNIQUE INDEX uq_person_role_one_current_primary
    ON person_role (person_id) WHERE valid_to IS NULL AND is_primary;
CREATE UNIQUE INDEX uq_person_role_no_dup_current
    ON person_role (person_id, role_id) WHERE valid_to IS NULL;
ALTER TABLE person_role ADD CONSTRAINT ck_person_role_dates
    CHECK (valid_to IS NULL OR valid_to >= valid_from);

-- Rule: exactly one current placement per engagement.
CREATE UNIQUE INDEX uq_employment_assignment_one_current
    ON employment_assignment (employment_id) WHERE valid_to IS NULL;
ALTER TABLE employment_assignment ADD CONSTRAINT ck_employment_assignment_dates
    CHECK (valid_to IS NULL OR valid_to >= valid_from);

ALTER TABLE employment ADD CONSTRAINT ck_employment_worker_type
    CHECK (worker_type IN ('Employee','Contractor','Intern'));
ALTER TABLE employment ADD CONSTRAINT ck_employment_contractor_mode
    CHECK (contractor_mode IS NULL OR contractor_mode IN ('independent','c2c'));
-- contractor_mode is only meaningful for a Contractor.
ALTER TABLE employment ADD CONSTRAINT ck_employment_contractor_mode_scope
    CHECK (contractor_mode IS NULL OR worker_type = 'Contractor');
ALTER TABLE employment ADD CONSTRAINT ck_employment_stage
    CHECK (stage IN ('Invited','Verifying','Verified','Active','Inactive'));
ALTER TABLE employment ADD CONSTRAINT ck_employment_exit_after_join
    CHECK (exited_on IS NULL OR exited_on >= joined_on);
ALTER TABLE employment ADD CONSTRAINT uq_employment_code UNIQUE (employment_code);

-- Rule: a link can be cancelled or reissued; only the hash is stored.
ALTER TABLE onboarding_token ADD CONSTRAINT uq_onboarding_token_hash UNIQUE (token_hash);
ALTER TABLE onboarding_token ADD CONSTRAINT ck_onboarding_token_status
    CHECK (status IN ('active','expired','revoked'));
ALTER TABLE onboarding_token ADD CONSTRAINT ck_onboarding_token_expiry
    CHECK (expires_at > issued_at);

-- Rule: one checklist item per requirement per engagement.
ALTER TABLE worker_document ADD CONSTRAINT uq_worker_document_per_requirement
    UNIQUE (employment_id, requirement_id);
ALTER TABLE worker_document ADD CONSTRAINT ck_worker_document_status
    CHECK (status IN ('Outstanding','Pending','Approved','Rejected'));

-- Rule: a rejection must carry a reason. Quarantine until the scan is clean.
ALTER TABLE document_file ADD CONSTRAINT ck_document_file_scan_state
    CHECK (scan_state IN ('pending','clean','infected'));
ALTER TABLE document_file ADD CONSTRAINT ck_document_file_review_status
    CHECK (review_status IS NULL OR review_status IN ('Approved','Rejected'));
ALTER TABLE document_file ADD CONSTRAINT ck_document_file_rejection_reason
    CHECK (review_status <> 'Rejected' OR rejection_reason IS NOT NULL);
-- A reviewed file must record who reviewed it and when.
ALTER TABLE document_file ADD CONSTRAINT ck_document_file_review_complete
    CHECK (review_status IS NULL
           OR (reviewed_by_person_id IS NOT NULL AND reviewed_at IS NOT NULL));
ALTER TABLE document_file ADD CONSTRAINT uq_document_file_storage_key
    UNIQUE (file_storage_key);

ALTER TABLE document_access_log ADD CONSTRAINT ck_document_access_action
    CHECK (action IN ('view','download'));

-- Rule: a visa or authorization is never overwritten.
ALTER TABLE visa_record ADD CONSTRAINT ck_visa_status
    CHECK (status IN ('current','superseded'));
ALTER TABLE visa_record ADD CONSTRAINT ck_visa_dates
    CHECK (valid_to >= valid_from);
CREATE UNIQUE INDEX uq_visa_one_current_per_person
    ON visa_record (person_id) WHERE status = 'current';
-- A superseded row must name its successor; a current row must not have one.
ALTER TABLE visa_record ADD CONSTRAINT ck_visa_supersession
    CHECK ((status = 'superseded') = (superseded_by_visa_id IS NOT NULL));

ALTER TABLE work_authorization ADD CONSTRAINT ck_auth_status
    CHECK (status IN ('current','superseded'));
ALTER TABLE work_authorization ADD CONSTRAINT ck_auth_dates
    CHECK (valid_to >= valid_from);
CREATE UNIQUE INDEX uq_auth_one_current_per_person
    ON work_authorization (person_id) WHERE status = 'current';
ALTER TABLE work_authorization ADD CONSTRAINT ck_auth_supersession
    CHECK ((status = 'superseded') = (superseded_by_auth_id IS NOT NULL));

-- Rule: one alert per record per threshold, ever.
-- Adopted unchanged from the circulated design: three nullable FKs, a CHECK
-- that exactly one is set, and a UNIQUE across all four columns.
ALTER TABLE expiry_alert ADD CONSTRAINT ck_expiry_alert_exactly_one_target
    CHECK ((visa_id IS NOT NULL)::int
         + (work_authorization_id IS NOT NULL)::int
         + (document_id IS NOT NULL)::int = 1);
ALTER TABLE expiry_alert ADD CONSTRAINT uq_expiry_alert_once
    UNIQUE (visa_id, work_authorization_id, document_id, threshold_days);

-- Rule: the winning eligibility rule is never ambiguous.
ALTER TABLE eligibility_rule ADD CONSTRAINT ck_eligibility_effect
    CHECK (effect IN ('allow','deny','needs_review'));
ALTER TABLE eligibility_rule ADD CONSTRAINT uq_eligibility_priority
    UNIQUE (rule_set_version, priority);

-- Rule: one attendance record per person per day.
ALTER TABLE attendance_record ADD CONSTRAINT uq_attendance_per_day
    UNIQUE (employment_id, record_date);
ALTER TABLE attendance_record ADD CONSTRAINT ck_attendance_status
    CHECK (status IN ('present','absent','holiday','leave'));
ALTER TABLE attendance_record ADD CONSTRAINT ck_attendance_source
    CHECK (source IN ('self','hr','system'));
-- Rule: a leave day must trace to an approved request.
ALTER TABLE attendance_record ADD CONSTRAINT ck_attendance_leave_traced
    CHECK ((status = 'leave') = (leave_id IS NOT NULL));
ALTER TABLE attendance_record ADD CONSTRAINT ck_attendance_clock_order
    CHECK (clock_out_at IS NULL OR clock_in_at IS NULL OR clock_out_at >= clock_in_at);

-- Rule: unpaid leave requires a written reason; paid leave requires a category.
ALTER TABLE leave_request ADD CONSTRAINT ck_leave_type
    CHECK (leave_type IN ('paid','unpaid'));
ALTER TABLE leave_request ADD CONSTRAINT ck_leave_status
    CHECK (status IN ('Pending','Approved','Rejected'));
ALTER TABLE leave_request ADD CONSTRAINT ck_leave_reason_or_category
    CHECK ((leave_type = 'unpaid' AND remark IS NOT NULL)
        OR (leave_type = 'paid'   AND category IS NOT NULL));
ALTER TABLE leave_request ADD CONSTRAINT ck_leave_dates
    CHECK (end_date >= start_date);
-- A decided request records who decided it and when.
ALTER TABLE leave_request ADD CONSTRAINT ck_leave_decision_complete
    CHECK (status = 'Pending'
           OR (decided_by_person_id IS NOT NULL AND decided_at IS NOT NULL));

-- Rule: leave balance is per category per year.
ALTER TABLE leave_entitlement ADD CONSTRAINT uq_leave_entitlement
    UNIQUE (employment_id, category, year);
ALTER TABLE leave_entitlement ADD CONSTRAINT ck_leave_entitlement_year
    CHECK (year BETWEEN 2000 AND 2100);

-- Rule: review stages run Self -> Team Lead -> HR; a submitted stage is locked.
ALTER TABLE performance_review_stage ADD CONSTRAINT ck_stage_name
    CHECK (stage_name IN ('Self','TeamLead','HR'));
ALTER TABLE performance_review_stage ADD CONSTRAINT uq_stage_per_review
    UNIQUE (review_id, stage_name);
ALTER TABLE performance_review_stage ADD CONSTRAINT ck_stage_locked_when_submitted
    CHECK (submitted_at IS NULL OR is_locked);

-- Rule: USER_ACCOUNT sits one-to-one between PERSON and SESSION.
ALTER TABLE user_account ADD CONSTRAINT uq_user_account_person UNIQUE (person_id);
ALTER TABLE user_account ADD CONSTRAINT uq_user_account_google_subject UNIQUE (google_subject);
CREATE UNIQUE INDEX uq_user_account_email_lower ON user_account (lower(email));
ALTER TABLE user_account ADD CONSTRAINT ck_user_account_status
    CHECK (status IN ('active','disabled'));
-- An unverified address is refused, so a stored account must be verified.
ALTER TABLE user_account ADD CONSTRAINT ck_user_account_verified CHECK (email_verified);

ALTER TABLE session ADD CONSTRAINT ck_session_expiry CHECK (expires_at > created_at);

ALTER TABLE one_time_code ADD CONSTRAINT ck_otp_purpose
    CHECK (purpose IN ('step_up','eligibility_override','sensitive_export'));
ALTER TABLE one_time_code ADD CONSTRAINT ck_otp_status
    CHECK (status IN ('issued','consumed','locked_out','expired'));
ALTER TABLE one_time_code ADD CONSTRAINT ck_otp_attempts
    CHECK (attempt_count >= 0 AND attempt_count <= max_attempts);
ALTER TABLE one_time_code ADD CONSTRAINT ck_otp_expiry CHECK (expires_at > created_at);

ALTER TABLE data_export_log ADD CONSTRAINT ck_export_type
    CHECK (export_type IN ('roster','attendance','audit'));

-- Rule: retention keeps aggregates, and RETENTION_ACTION re-identifies nobody.
ALTER TABLE retention_action ADD CONSTRAINT ck_retention_dates
    CHECK (exited_on >= joined_on);

-- ///////////////////////////////////////////////////////////////////
-- //  65_vocabularies_TO_CONFIRM.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- NOT APPLIED BY DEFAULT — needs a business owner's confirmation first.
--
-- The blueprint states that VISA_RECORD.visa_type is a CHECK-constrained
-- controlled vocabulary, and that leave categories are configuration.
-- Neither list is enumerated anywhere in the FSD, so the values are NOT
-- invented here. Confirm the lists, then uncomment and run this file.
--
-- Until then both columns are free text, which is the honest state: the
-- schema does not pretend to know a vocabulary nobody has defined.
-- =====================================================================

-- ALTER TABLE visa_record ADD CONSTRAINT ck_visa_type
--     CHECK (visa_type IN (  /* confirm with HR / Legal */  ));

-- ALTER TABLE work_authorization ADD CONSTRAINT ck_auth_type
--     CHECK (auth_type IN (  /* confirm with HR / Legal */  ));

-- Leave categories are configuration ("Configuration is data"), so the
-- preferred fix is a LEAVE_CATEGORY reference table rather than a CHECK.
-- That is a schema addition and therefore a decision, not a default.

-- ///////////////////////////////////////////////////////////////////
-- //  70_indexes.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- The 11 indexes from "Indexes, and the access pattern each one serves".
-- Unique constraints already create their own; only the rest are here.
-- =====================================================================

-- The current-placement lookup — the most frequent read in the product.
-- (Covered by uq_employment_assignment_one_current.)

-- Headcount by department, today and for any past date.
CREATE INDEX IF NOT EXISTS ix_assignment_dept_dates
    ON employment_assignment (department_id, valid_from, valid_to);

-- Tier resolution, which runs on every request. The hottest path in the system.
CREATE INDEX IF NOT EXISTS ix_person_role_current
    ON person_role (person_id) WHERE valid_to IS NULL;

-- Walking the chart for scope, and finding team leads.
CREATE INDEX IF NOT EXISTS ix_role_reports_to ON role (reports_to_role_id);

-- This partial index IS the set the activation gate counts.
CREATE INDEX IF NOT EXISTS ix_worker_document_gate
    ON worker_document (employment_id)
    WHERE is_mandatory AND status <> 'Approved';

-- The HR verification queue: a small slice of a growing table.
CREATE INDEX IF NOT EXISTS ix_worker_document_pending
    ON worker_document (status) WHERE status = 'Pending';

-- Every attendance lookup filters on both.
-- (Covered by uq_attendance_per_day.)

-- The daily expiry scan reads only live rows.
CREATE INDEX IF NOT EXISTS ix_visa_expiry_scan   ON visa_record (valid_to)       WHERE status = 'current';
CREATE INDEX IF NOT EXISTS ix_auth_expiry_scan   ON work_authorization (valid_to) WHERE status = 'current';
CREATE INDEX IF NOT EXISTS ix_worker_doc_expiry  ON worker_document (expiry_date) WHERE expiry_date IS NOT NULL;

-- The retention sweep, which only touches exited engagements.
CREATE INDEX IF NOT EXISTS ix_employment_retention
    ON employment (retention_due_on) WHERE retention_due_on IS NOT NULL;

-- Date-range retention scans, and the per-record audit view.
CREATE INDEX IF NOT EXISTS ix_audit_occurred_at ON audit_log (occurred_at);
CREATE INDEX IF NOT EXISTS ix_audit_entity      ON audit_log (entity_type, entity_id);

-- Directory search tolerant of misspelling.
-- coalesce + ||, NOT concat_ws.
--
-- last_name is nullable because the real org matrix contains mononyms, and
-- 'Akshat' || ' ' || NULL is NULL — which would silently drop every
-- single-name person out of directory search. concat_ws solves that but is
-- only STABLE, and PostgreSQL refuses a non-IMMUTABLE function in an index
-- expression. Cloud SQL rejected it outright. coalesce and || are both
-- IMMUTABLE, so this form is equivalent, indexable, and still mononym-safe.
--
-- The query in backend/app/directory.py MUST use this identical expression,
-- or the planner will not use this index.
CREATE INDEX IF NOT EXISTS ix_person_name_trgm
    ON person USING gin (
        (coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(preferred_name, ''))
        gin_trgm_ops);

-- ///////////////////////////////////////////////////////////////////
-- //  80_security.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- Security. From "Sensitive data, and the control on each".
--
-- The append-only claim in the blueprint is made TRUE here. A schema note
-- cannot make that claim; a revoked permission can.
--
-- Everything is conditional on the wf_app role existing, so this file is a
-- no-op (with a warning) on a managed platform that would not let
-- 00_extensions.sql create it.
-- =====================================================================

DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wf_app') THEN
    RAISE WARNING '=====================================================';
    RAISE WARNING 'Role wf_app does not exist, so NO grants were applied.';
    RAISE WARNING 'The audit tables are NOT append-only on this database.';
    RAISE WARNING 'Create a non-owning role for the application, then re-run';
    RAISE WARNING 'this file, before treating the audit trail as tamper-proof.';
    RAISE WARNING '=====================================================';
    RETURN;
END IF;

EXECUTE 'GRANT USAGE ON SCHEMA public TO wf_app';
EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wf_app';
EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wf_app';

-- Rule: audit is append-only for every tier including founder.
-- The application role may add rows and read them. It may not change or remove
-- them, because the permission does not exist to be used.
EXECUTE 'REVOKE UPDATE, DELETE ON audit_log           FROM wf_app';
EXECUTE 'REVOKE UPDATE, DELETE ON document_access_log FROM wf_app';
EXECUTE 'REVOKE UPDATE, DELETE ON data_export_log     FROM wf_app';

-- EXPIRY_ALERT: rows are never edited, but message_status is written once
-- delivery is accepted, so UPDATE is retained and DELETE is not.
EXECUTE 'REVOKE DELETE ON expiry_alert FROM wf_app';

-- RETENTION_ACTION is the proof that a deletion happened. It must outlive
-- everything it describes.
EXECUTE 'REVOKE UPDATE, DELETE ON retention_action FROM wf_app';

-- Future tables default to the same shape.
EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wf_app';

RAISE NOTICE 'Grants applied; audit tables are append-only for wf_app.';
END
$$;

-- ///////////////////////////////////////////////////////////////////
-- //  90_seed_root.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- The one row the schema itself depends on.
--
-- ROLE.department_id is ON DELETE SET DEFAULT so that deleting a department
-- moves its seats to the company root rather than deleting them. That
-- default has to point at a row that exists, with a fixed id.
-- =====================================================================
INSERT INTO department (department_id, name, is_root, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'KATBOTZ', true, true)
ON CONFLICT (department_id) DO NOTHING;

-- ///////////////////////////////////////////////////////////////////
-- //  95_additions_beyond_blueprint.sql
-- ///////////////////////////////////////////////////////////////////
-- =====================================================================
-- ADDITIONS BEYOND THE APPROVED BLUEPRINT (37 tables / 267 columns).
-- Listed separately so the approved design stays auditable and every
-- departure from it is visible in one place.
-- =====================================================================

-- ROLE.level — the org matrix's visual band (0 executive .. 4 intern).
--
-- Why this is needed: the org chart screen lays seats out by band, and the
-- approved schema has nowhere to hold it. reports_to_role_id would be the
-- structural alternative, but the source records no reporting lines and
-- zero edges are populated, so level is currently the ONLY layout data
-- that exists. Without it the org chart cannot render.
--
-- It is a display band, not a reporting line, and nothing derives
-- permissions from it except the intern tier, which base_tier already
-- carries independently.
ALTER TABLE role ADD COLUMN level smallint;
ALTER TABLE role ADD CONSTRAINT ck_role_level
    CHECK (level IS NULL OR level BETWEEN 0 AND 4);
COMMENT ON COLUMN role.level IS
    'Org-matrix display band 0-4. Layout only. Addition beyond the approved blueprint.';

-- DOCUMENT_REQUIREMENT.reference_url — a link to the form the worker must fill.
--
-- Why this is needed: several real checklist items are not "upload a document
-- you already have" but "fill in this specific form" — the IRS W-9 and W-4 are
-- both live URLs in the current checklists. Without somewhere to keep the link,
-- onboarding would tell a worker to complete a form without saying which one.
--
-- It is configuration, not worker data: it belongs to the requirement, changes
-- when a tax form is reissued, and is the same for everyone it applies to.
ALTER TABLE document_requirement ADD COLUMN reference_url text;
ALTER TABLE document_requirement ADD CONSTRAINT ck_document_requirement_url
    CHECK (reference_url IS NULL OR reference_url ~ '^https://');
COMMENT ON COLUMN document_requirement.reference_url IS
    'Link to the form to complete, e.g. the IRS W-9. Addition beyond the approved blueprint.';

-- A sequence behind EMPLOYMENT.employment_code ("EMP-001").
--
-- Why: the code is the number people quote, and it is UNIQUE. Deriving it from
-- max(existing)+1 races — two HR users onboarding at the same moment would
-- compute the same code and one INSERT would fail. A sequence hands out
-- distinct values without either transaction waiting for the other.
--
-- Gaps are possible (a rolled-back onboarding consumes a number). That is the
-- correct trade: a gap in a reference code is harmless, a duplicate is not.
CREATE SEQUENCE IF NOT EXISTS employment_code_seq AS integer START 1;
GRANT USAGE, SELECT ON SEQUENCE employment_code_seq TO wf_app;
COMMENT ON SEQUENCE employment_code_seq IS
    'Feeds EMPLOYMENT.employment_code. Addition beyond the approved blueprint.';
