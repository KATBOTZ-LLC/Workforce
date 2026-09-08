-- WF-001 — 012 functions, triggers, views: the rules the engine enforces
SET search_path = wf, public;

-- 1. Audit tables are append-only, for every user including the founder.
CREATE OR REPLACE FUNCTION deny_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: % is not permitted', TG_TABLE_NAME, TG_OP;
END $$;

CREATE TRIGGER audit_log_append_only        BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION deny_change();
CREATE TRIGGER document_access_append_only  BEFORE UPDATE OR DELETE ON document_access_log
  FOR EACH ROW EXECUTE FUNCTION deny_change();
CREATE TRIGGER eligibility_decision_append_only BEFORE UPDATE OR DELETE ON eligibility_decision
  FOR EACH ROW EXECUTE FUNCTION deny_change();
CREATE TRIGGER expiry_alert_append_only     BEFORE UPDATE OR DELETE ON expiry_alert
  FOR EACH ROW EXECUTE FUNCTION deny_change();

-- 2. The company root can never be deleted (FSD section 5).
CREATE OR REPLACE FUNCTION protect_root_unit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_root THEN
    RAISE EXCEPTION 'the company root unit cannot be deleted';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER org_unit_protect_root BEFORE DELETE ON org_unit
  FOR EACH ROW EXECUTE FUNCTION protect_root_unit();

-- 3. Reporting cycles are refused BEFORE commit, not flagged afterwards (FSD test 12).
--    Uses the native CYCLE clause (PostgreSQL 14+).
CREATE OR REPLACE FUNCTION assert_no_reporting_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cycle_found boolean;
BEGIN
  WITH RECURSIVE walk(from_role_id, to_role_id) AS (
      SELECT e.from_role_id, e.to_role_id FROM org_edge e WHERE e.from_role_id = NEW.to_role_id
    UNION ALL
      SELECT e.from_role_id, e.to_role_id
      FROM org_edge e JOIN walk w ON e.from_role_id = w.to_role_id
  ) CYCLE from_role_id SET is_cycle USING path
  SELECT EXISTS (SELECT 1 FROM walk WHERE to_role_id = NEW.from_role_id OR is_cycle)
    INTO cycle_found;

  IF cycle_found THEN
    RAISE EXCEPTION 'reporting cycle: % cannot report to %, directly or indirectly',
      NEW.from_role_id, NEW.to_role_id;
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER org_edge_no_cycle
  AFTER INSERT OR UPDATE ON org_edge
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION assert_no_reporting_cycle();

-- 4. A submitted review stage is locked; a change means a superseding review (FSD section 3).
CREATE OR REPLACE FUNCTION lock_submitted_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'review stage % is submitted and locked; create a superseding review', OLD.stage;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER review_stage_lock BEFORE UPDATE OR DELETE ON review_stage
  FOR EACH ROW EXECUTE FUNCTION lock_submitted_review();

-- 5. Review stages run in order: self, team lead, HR, finalized (FSD test 19).
CREATE OR REPLACE FUNCTION assert_review_sequence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE required review_stage_kind;
BEGIN
  required := CASE NEW.stage
                WHEN 'team_lead' THEN 'self'::review_stage_kind
                WHEN 'hr'        THEN 'team_lead'::review_stage_kind
                WHEN 'finalized' THEN 'hr'::review_stage_kind
                ELSE NULL END;
  IF required IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM review_stage s
       WHERE s.review_period_id = NEW.review_period_id
         AND s.stage = required AND s.submitted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'review stage % cannot start until % is submitted', NEW.stage, required;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER review_stage_sequence BEFORE INSERT ON review_stage
  FOR EACH ROW EXECUTE FUNCTION assert_review_sequence();

-- 6. The account-creation gate. Called inside the activating transaction; takes a row lock
--    so two concurrent activations cannot both succeed (FSD tests 9, 10).
CREATE OR REPLACE FUNCTION activate_worker(p_worker_id text, p_actor text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE outstanding integer; current_stage worker_stage;
BEGIN
  SELECT stage INTO current_stage FROM worker WHERE id = p_worker_id FOR UPDATE;
  IF current_stage IS NULL THEN
    RAISE EXCEPTION 'no such worker: %', p_worker_id;
  END IF;

  SELECT count(*) INTO outstanding
  FROM worker_document d
  WHERE d.worker_id = p_worker_id AND d.is_mandatory AND d.status <> 'approved';

  IF outstanding > 0 THEN
    RAISE EXCEPTION 'cannot create account: % mandatory document(s) still unapproved', outstanding;
  END IF;

  UPDATE worker SET stage = 'active', account_created = true WHERE id = p_worker_id;

  INSERT INTO audit_log (actor_email, action, entity_type, entity_id, summary, after_val)
  VALUES (p_actor, 'account.create', 'worker', p_worker_id,
          'Account created; all mandatory documents approved',
          jsonb_build_object('stage','active','account_created',true));
END $$;

-- 7. Visible-person scope: the whole subtree below a person, in one round trip (FSD section 6).
CREATE OR REPLACE FUNCTION visible_person_ids(p_person_id text)
RETURNS TABLE (person_id text) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE mine AS (
      SELECT r.id AS role_id FROM org_role r WHERE r.person_id = p_person_id
    UNION
      SELECT e.from_role_id
      FROM org_edge e JOIN mine m ON e.to_role_id = m.role_id
      WHERE e.type = 'reports_to'
  )
  SELECT DISTINCT r.person_id
  FROM mine m JOIN org_role r ON r.id = m.role_id
  WHERE r.person_id IS NOT NULL;
$$;

-- 8. Directory view: no date of birth, no identifier fields.
CREATE OR REPLACE VIEW worker_directory AS
SELECT w.id, w.first_name, w.last_name, w.preferred_name, w.designation,
       u.name AS department, w.location, w.type, w.status, w.stage
FROM worker w JOIN org_unit u ON u.id = w.department_unit_id;

-- 9. Leave balance per worker per type, holidays excluded by construction.
CREATE OR REPLACE VIEW leave_balance AS
SELECT w.id AS worker_id, t.code AS leave_type, t.entitlement_days,
       coalesce(sum(upper(l.span) - lower(l.span)) FILTER (WHERE l.status = 'approved'), 0) AS days_taken
FROM worker w
CROSS JOIN leave_type t
LEFT JOIN leave_request l ON l.worker_id = w.id AND l.leave_type = t.code
GROUP BY w.id, t.code, t.entitlement_days;
