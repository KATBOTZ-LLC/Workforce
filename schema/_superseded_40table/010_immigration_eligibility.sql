-- WF-001 — 010 immigration, work authorization, eligibility  (FSD: specified, not yet built)
SET search_path = wf, public;

-- Identifier-class fields are encrypted by the application with a key held in Cloud KMS.
-- The HMAC column allows lookup by passport number without decrypting the table.
CREATE TABLE visa_record (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  visa_type         text NOT NULL,
  issuing_country   text NOT NULL,
  valid_from        date NOT NULL,
  valid_to          date NOT NULL,
  doc_number_cipher bytea,
  doc_number_hmac   bytea,
  superseded_by     uuid REFERENCES visa_record(id) ON DELETE SET NULL,
  recorded_by       text NOT NULL,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  validity          daterange GENERATED ALWAYS AS (daterange(valid_from, valid_to, '[]')) STORED,
  CONSTRAINT visa_valid_range CHECK (valid_to >= valid_from),
  -- A record is never overwritten; a change supersedes. Two live visas may not overlap.
  CONSTRAINT visa_no_overlap_live
    EXCLUDE USING gist (worker_id WITH =, validity WITH &&) WHERE (superseded_by IS NULL)
);
CREATE INDEX visa_record_worker  ON visa_record (worker_id) WHERE superseded_by IS NULL;
CREATE INDEX visa_record_expiry  ON visa_record (valid_to) WHERE superseded_by IS NULL;
CREATE UNIQUE INDEX visa_doc_number_hmac ON visa_record (doc_number_hmac) WHERE doc_number_hmac IS NOT NULL;

CREATE TABLE work_authorization (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  auth_type         text NOT NULL,
  valid_from        date NOT NULL,
  valid_to          date NOT NULL,
  duration_months   integer CHECK (duration_months IS NULL OR duration_months > 0),
  prohibits_unpaid  boolean NOT NULL DEFAULT false,
  restrictions      jsonb NOT NULL DEFAULT '{}'::jsonb,
  doc_number_cipher bytea,
  doc_number_hmac   bytea,
  superseded_by     uuid REFERENCES work_authorization(id) ON DELETE SET NULL,
  recorded_by       text NOT NULL,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  validity          daterange GENERATED ALWAYS AS (daterange(valid_from, valid_to, '[]')) STORED,
  CONSTRAINT work_auth_valid_range CHECK (valid_to >= valid_from),
  CONSTRAINT work_auth_no_overlap_live
    EXCLUDE USING gist (worker_id WITH =, validity WITH &&) WHERE (superseded_by IS NULL)
);
CREATE INDEX work_auth_worker ON work_authorization (worker_id) WHERE superseded_by IS NULL;
CREATE INDEX work_auth_expiry ON work_authorization (valid_to) WHERE superseded_by IS NULL;
CREATE INDEX work_auth_restrictions ON work_authorization USING gin (restrictions jsonb_path_ops);

CREATE TABLE education_record (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id           text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  institution         text NOT NULL,
  programme           text,
  expected_graduation date,
  actual_graduation   date,
  evidence_document_id uuid REFERENCES worker_document(id) ON DELETE SET NULL
);
CREATE INDEX education_worker ON education_record (worker_id);

-- Rules are configuration per country, never built into the product (FSD section 4).
CREATE TABLE eligibility_rule_set (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version        integer NOT NULL UNIQUE,
  effective_from date NOT NULL,
  created_by     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE eligibility_rule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id     uuid NOT NULL REFERENCES eligibility_rule_set(id) ON DELETE CASCADE,
  country         text,
  visa_type       text,
  employment_type text,
  is_paid         boolean,                       -- NULL = applies to both
  effect          eligibility_effect NOT NULL,
  priority        integer NOT NULL,
  is_overridable  boolean NOT NULL DEFAULT false,
  description     text NOT NULL,
  UNIQUE (rule_set_id, priority)
);
CREATE INDEX eligibility_rule_match ON eligibility_rule (rule_set_id, country, visa_type, employment_type);

-- A decision references the exact rule set evaluated, and keeps an immutable copy of its
-- inputs, so it stays explainable after the rules change (FSD section 6). Insert-only (013).
CREATE TABLE eligibility_decision (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id      text NOT NULL REFERENCES worker(id) ON DELETE RESTRICT,
  rule_set_id    uuid NOT NULL REFERENCES eligibility_rule_set(id) ON DELETE RESTRICT,
  outcome        eligibility_effect NOT NULL,
  input_snapshot jsonb NOT NULL,
  decided_by     text NOT NULL,
  decided_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eligibility_decision_worker ON eligibility_decision (worker_id, decided_at DESC);
CREATE INDEX eligibility_decision_inputs ON eligibility_decision USING gin (input_snapshot jsonb_path_ops);

CREATE TABLE eligibility_decision_reason (
  decision_id uuid NOT NULL REFERENCES eligibility_decision(id) ON DELETE CASCADE,
  rule_id     uuid NOT NULL REFERENCES eligibility_rule(id) ON DELETE RESTRICT,
  PRIMARY KEY (decision_id, rule_id)
);

CREATE TABLE eligibility_override (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id  uuid NOT NULL UNIQUE REFERENCES eligibility_decision(id) ON DELETE RESTRICT,
  actor_email  citext NOT NULL,
  reason       text NOT NULL,
  otp_challenge_id uuid,                     -- FK added in 011 once otp_challenge exists
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eligibility_override_reason_not_blank CHECK (btrim(reason) <> '')
);

-- Idempotency for the daily scan: one alert per record per threshold, forever.
-- This is what makes a repeat run produce nothing (FSD test 18).
CREATE TABLE expiry_alert (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type   text NOT NULL CHECK (subject_type IN ('visa','work_authorization','document')),
  subject_id     uuid NOT NULL,
  threshold_days integer NOT NULL CHECK (threshold_days IN (90,60,30,7,0)),
  worker_id      text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id, threshold_days)
);

CREATE TABLE compliance_exception (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  kind       exception_kind NOT NULL,
  subject_id uuid,
  raised_at  timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  cleared_by text
);
CREATE INDEX compliance_exception_open ON compliance_exception (worker_id) WHERE cleared_at IS NULL;

-- Observability for the scan itself: a scheduler that stops silently is the main failure mode.
CREATE TABLE scan_run (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  records_examined  integer NOT NULL DEFAULT 0,
  alerts_raised     integer NOT NULL DEFAULT 0,
  failures          integer NOT NULL DEFAULT 0,
  triggered_by      text NOT NULL DEFAULT 'scheduler'
);
