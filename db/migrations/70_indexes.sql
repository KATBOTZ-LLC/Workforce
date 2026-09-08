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
