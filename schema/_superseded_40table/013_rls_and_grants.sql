-- WF-001 — 013 row-level security and grants: the second enforcement layer
-- FSD section 6 requires enforcement that survives an application bug (test 20).
SET search_path = wf, public;

GRANT USAGE ON SCHEMA wf TO app_rw, app_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA wf TO app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA wf TO app_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA wf TO app_rw;

-- Append-only tables: INSERT only, for every user. No UPDATE, no DELETE, ever.
REVOKE UPDATE, DELETE ON audit_log, document_access_log, eligibility_decision, expiry_alert FROM app_rw;
REVOKE UPDATE, DELETE ON audit_log, document_access_log, eligibility_decision, expiry_alert FROM PUBLIC;

-- Retention is the one process permitted to delete worker data, and it runs as app_migrate.
REVOKE DELETE ON worker FROM app_rw;

-- The application sets these per transaction:
--   SET LOCAL wf.person_id = '<person>';  SET LOCAL wf.tier = 'hr';
CREATE OR REPLACE FUNCTION current_person() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('wf.person_id', true), '') $$;
CREATE OR REPLACE FUNCTION current_tier() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('wf.tier', true), ''), 'employee') $$;
CREATE OR REPLACE FUNCTION is_privileged() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT current_tier() IN ('founder','hr') $$;

ALTER TABLE worker            ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_email      ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_document   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_session      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_request     ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_period     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE task              ENABLE ROW LEVEL SECURITY;
ALTER TABLE note              ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_record       ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_authorization ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification      ENABLE ROW LEVEL SECURITY;

-- Founder and HR see everyone; everyone else sees only their own record.
-- A handler that forgets a WHERE clause returns zero rows, not other people's data.
CREATE POLICY worker_scope ON worker USING (
  is_privileged() OR org_person_id = current_person()
);
CREATE POLICY worker_email_scope ON worker_email USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY worker_document_scope ON worker_document USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY attendance_scope ON attendance USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY time_session_scope ON time_session USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY leave_request_scope ON leave_request USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY review_period_scope ON review_period USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY goal_scope ON goal USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY task_scope ON task USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
CREATE POLICY note_scope ON note USING (
  is_privileged() OR worker_id IN (SELECT id FROM worker WHERE org_person_id = current_person())
);
-- Immigration data is restricted beyond the ordinary record: privileged tiers only.
CREATE POLICY visa_scope ON visa_record USING (is_privileged());
CREATE POLICY work_auth_scope ON work_authorization USING (is_privileged());
CREATE POLICY notification_scope ON notification USING (
  is_privileged() OR person_id = current_person()
);
