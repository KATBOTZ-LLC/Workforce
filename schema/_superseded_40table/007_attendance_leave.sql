-- WF-001 — 007 attendance, time tracking, leave
SET search_path = wf, public;

-- Holidays are not leave and consume no entitlement (FSD section 4, Open Item 23).
CREATE TABLE holiday_calendar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region       text NOT NULL,
  holiday_date date NOT NULL,
  name         text NOT NULL,
  UNIQUE (region, holiday_date)
);

-- Paid leave carries a category; unpaid leave requires a written remark (FSD section 4).
CREATE TABLE leave_type (
  code             text PRIMARY KEY,        -- sick, bereavement, pto, unpaid
  label            text NOT NULL,
  is_paid          boolean NOT NULL,
  entitlement_days numeric(5,1),            -- NULL = uncapped; values pending Open Item 22
  accrual          text,
  carry_over_days  numeric(5,1),
  requires_remark  boolean NOT NULL DEFAULT false,
  active           boolean NOT NULL DEFAULT true,
  CONSTRAINT leave_type_unpaid_is_uncapped CHECK (is_paid OR entitlement_days IS NULL)
);

CREATE TABLE leave_request (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  leave_type   text NOT NULL REFERENCES leave_type(code) ON DELETE RESTRICT,
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  remark       text,
  status       leave_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by   text,
  decided_at   timestamptz,
  span         daterange GENERATED ALWAYS AS (daterange(start_date, end_date, '[]')) STORED,
  CONSTRAINT leave_end_not_before_start CHECK (end_date >= start_date),
  CONSTRAINT leave_decision_complete
    CHECK ((status IN ('pending','cancelled')) = (decided_by IS NULL AND decided_at IS NULL)),
  -- No worker may hold two approved leaves covering the same day.
  CONSTRAINT leave_no_overlap_when_approved
    EXCLUDE USING gist (worker_id WITH =, span WITH &&) WHERE (status = 'approved')
);
CREATE INDEX leave_request_worker  ON leave_request (worker_id, start_date DESC);
CREATE INDEX leave_request_pending ON leave_request (status) WHERE status = 'pending';

CREATE TABLE attendance (
  worker_id        text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  attendance_date  date NOT NULL,
  status           attendance_status NOT NULL,
  leave_request_id uuid REFERENCES leave_request(id) ON DELETE SET NULL,
  place            punch_place,
  source           record_source NOT NULL DEFAULT 'self',
  recorded_by      text,
  recorded_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, attendance_date),     -- one record per worker per day
  CONSTRAINT attendance_leave_needs_request CHECK (status <> 'leave' OR leave_request_id IS NOT NULL)
);
CREATE INDEX attendance_date ON attendance (attendance_date);

CREATE TABLE time_session (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at   timestamptz,
  place      punch_place NOT NULL DEFAULT 'remote',
  source     record_source NOT NULL DEFAULT 'self',
  CONSTRAINT time_session_end_after_start CHECK (ended_at IS NULL OR ended_at > started_at)
);
CREATE INDEX time_session_worker ON time_session (worker_id, started_at DESC);
-- At most one running session per worker.
CREATE UNIQUE INDEX time_session_one_open_per_worker ON time_session (worker_id) WHERE ended_at IS NULL;
