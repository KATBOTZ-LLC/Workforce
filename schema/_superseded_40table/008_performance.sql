-- WF-001 — 008 monthly performance reviews
SET search_path = wf, public;

CREATE TABLE review_period (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  period_month date NOT NULL,                   -- always the first of the month
  superseded_by uuid REFERENCES review_period(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_period_is_month_start CHECK (date_trunc('month', period_month)::date = period_month)
);
-- One live review per worker per month; a superseding review is a new row.
CREATE UNIQUE INDEX review_period_one_live ON review_period (worker_id, period_month) WHERE superseded_by IS NULL;

CREATE TABLE review_stage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_period_id uuid NOT NULL REFERENCES review_period(id) ON DELETE CASCADE,
  stage            review_stage_kind NOT NULL,
  rating           smallint CHECK (rating BETWEEN 1 AND 5),
  feedback         text,
  submitted_at     timestamptz,                  -- non-null means locked (trigger in 012)
  submitted_by     text,
  UNIQUE (review_period_id, stage),
  CONSTRAINT review_stage_submitted_is_complete
    CHECK (submitted_at IS NULL OR (rating IS NOT NULL AND btrim(coalesce(feedback,'')) <> '' AND submitted_by IS NOT NULL))
);
CREATE INDEX review_stage_period ON review_stage (review_period_id);
