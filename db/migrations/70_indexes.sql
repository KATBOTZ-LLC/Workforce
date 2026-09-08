-- =====================================================================
-- The 11 indexes from "Indexes, and the access pattern each one serves".
-- Unique constraints already create their own; only the rest are here.
-- =====================================================================

-- The current-placement lookup — the most frequent read in the product.
-- (Covered by uq_employment_assignment_one_current.)

-- Headcount by department, today and for any past date.
CREATE INDEX ix_assignment_dept_dates
    ON employment_assignment (department_id, valid_from, valid_to);

-- Tier resolution, which runs on every request. The hottest path in the system.
CREATE INDEX ix_person_role_current
    ON person_role (person_id) WHERE valid_to IS NULL;

-- Walking the chart for scope, and finding team leads.
CREATE INDEX ix_role_reports_to ON role (reports_to_role_id);

-- This partial index IS the set the activation gate counts.
CREATE INDEX ix_worker_document_gate
    ON worker_document (employment_id)
    WHERE is_mandatory AND status <> 'Approved';

-- The HR verification queue: a small slice of a growing table.
CREATE INDEX ix_worker_document_pending
    ON worker_document (status) WHERE status = 'Pending';

-- Every attendance lookup filters on both.
-- (Covered by uq_attendance_per_day.)

-- The daily expiry scan reads only live rows.
CREATE INDEX ix_visa_expiry_scan   ON visa_record (valid_to)       WHERE status = 'current';
CREATE INDEX ix_auth_expiry_scan   ON work_authorization (valid_to) WHERE status = 'current';
CREATE INDEX ix_worker_doc_expiry  ON worker_document (expiry_date) WHERE expiry_date IS NOT NULL;

-- The retention sweep, which only touches exited engagements.
CREATE INDEX ix_employment_retention
    ON employment (retention_due_on) WHERE retention_due_on IS NOT NULL;

-- Date-range retention scans, and the per-record audit view.
CREATE INDEX ix_audit_occurred_at ON audit_log (occurred_at);
CREATE INDEX ix_audit_entity      ON audit_log (entity_type, entity_id);

-- Directory search tolerant of misspelling.
-- concat_ws, not ||: last_name is nullable because the real org matrix
-- contains mononyms, and 'Akshat' || ' ' || NULL is NULL — which would
-- silently drop every single-name person out of directory search.
CREATE INDEX ix_person_name_trgm
    ON person USING gin (concat_ws(' ', first_name, last_name, preferred_name) gin_trgm_ops);
