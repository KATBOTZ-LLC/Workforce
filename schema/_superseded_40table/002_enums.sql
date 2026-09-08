-- WF-001 — 002 enumerated types
SET search_path = wf, public;

CREATE TYPE worker_type      AS ENUM ('Employee','Contractor','Intern');
CREATE TYPE employment_type  AS ENUM ('Full-time','Part-time','Contract');
CREATE TYPE worker_stage     AS ENUM ('invited','documents_submitted','verifying','verified','active','inactive');
CREATE TYPE worker_status    AS ENUM ('active','inactive');
CREATE TYPE email_kind       AS ENUM ('personal','professional');
CREATE TYPE access_tier      AS ENUM ('founder','hr','employee','intern');
CREATE TYPE edge_type        AS ENUM ('reports_to','accountable_to','dotted');

CREATE TYPE document_status  AS ENUM ('outstanding','pending','approved','rejected');
CREATE TYPE scan_status      AS ENUM ('pending','clean','infected','failed');
CREATE TYPE rejection_reason AS ENUM ('unclear','expired','invalid','incomplete','damaged','wrong_document',
                                      'illegible_signature','other');

CREATE TYPE attendance_status AS ENUM ('present','absent','leave','holiday');
CREATE TYPE punch_place       AS ENUM ('in_office','remote','outside_geofence','location_off','hr_entered');
CREATE TYPE record_source     AS ENUM ('self','hr','system');

CREATE TYPE leave_status     AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE review_stage_kind AS ENUM ('self','team_lead','hr','finalized');
CREATE TYPE goal_status      AS ENUM ('not_started','in_progress','completed');

CREATE TYPE eligibility_effect AS ENUM ('eligible','ineligible','needs_review');
CREATE TYPE exception_kind     AS ENUM ('visa_expired','authorization_expired','document_expired');
CREATE TYPE otp_purpose        AS ENUM ('step_up','eligibility_override','sensitive_export');
CREATE TYPE outbox_kind        AS ENUM ('email','notification');
