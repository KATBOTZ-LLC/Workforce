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
