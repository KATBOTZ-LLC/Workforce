-- WF-001 — 004 worker record
SET search_path = wf, public;

CREATE TABLE worker (
  id                   text PRIMARY KEY,                     -- e.g. w-akshat
  org_person_id        text UNIQUE REFERENCES person(id) ON DELETE RESTRICT,
  first_name           text NOT NULL,
  last_name            text NOT NULL,
  preferred_name       text,
  gender               text,
  date_of_birth        date,                                 -- restricted: not exposed in directory views
  about                text,
  phone                text NOT NULL,
  country              text, state text, address text, pincode text,
  timezone             text,
  type                 worker_type NOT NULL,
  contractor_mode      text,
  employment_type      employment_type,
  designation          text NOT NULL,
  department_unit_id   text NOT NULL REFERENCES org_unit(id) ON DELETE RESTRICT,
  location             text NOT NULL,
  region               text NOT NULL,                        -- drives the document checklist (IN / US)
  hr_lead_person_id    text REFERENCES person(id) ON DELETE SET NULL,
  hr_lead_unresolved   text,                                 -- a name matching nobody, surfaced as a warning
  status               worker_status NOT NULL DEFAULT 'active',
  stage                worker_stage  NOT NULL DEFAULT 'invited',
  account_created      boolean NOT NULL DEFAULT false,
  nationality          text,
  immigration_status   text,
  date_of_joining      date NOT NULL,
  date_of_exit         date,
  work_experience      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  -- Retention clock: three years after exit (FSD section 6). NULL while employed.
  retention_due_on     date GENERATED ALWAYS AS (
                         CASE WHEN date_of_exit IS NULL THEN NULL
                              ELSE (date_of_exit + INTERVAL '3 years')::date END) STORED,
  CONSTRAINT worker_contractor_mode_only_for_contractors
    CHECK (contractor_mode IS NULL OR type = 'Contractor'),
  CONSTRAINT worker_exit_after_joining
    CHECK (date_of_exit IS NULL OR date_of_exit >= date_of_joining),
  -- A reference is either resolved or explicitly unresolved, never silently repointed (FSD section 5)
  CONSTRAINT worker_hr_lead_resolved_or_named
    CHECK (NOT (hr_lead_person_id IS NOT NULL AND hr_lead_unresolved IS NOT NULL)),
  -- An account can exist only from the Verified stage onward (the gate lives in 012)
  CONSTRAINT worker_account_requires_stage
    CHECK (NOT account_created OR stage IN ('active','inactive'))
);
CREATE INDEX worker_status_department ON worker (status, department_unit_id);
CREATE INDEX worker_status_stage      ON worker (status, stage);
CREATE INDEX worker_retention_due     ON worker (retention_due_on) WHERE retention_due_on IS NOT NULL;
CREATE INDEX worker_name_trgm         ON worker USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- One email identifies one worker: case-insensitive, across BOTH fields, on create and on edit.
-- A single constraint the engine enforces under concurrency (FSD tests 6 and 7).
CREATE TABLE worker_email (
  worker_id text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  kind      email_kind NOT NULL,
  email     citext NOT NULL,
  PRIMARY KEY (worker_id, kind),
  CONSTRAINT worker_email_unique_org_wide UNIQUE (email)
);

CREATE TABLE worker_team_lead (
  worker_id text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  person_id text NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, person_id)
);
