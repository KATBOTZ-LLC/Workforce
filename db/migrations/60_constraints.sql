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
