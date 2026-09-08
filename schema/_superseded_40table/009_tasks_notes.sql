-- WF-001 — 009 goals, tasks, notes
SET search_path = wf, public;

CREATE TABLE goal (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  name       text NOT NULL,
  deadline   date,
  status     goal_status NOT NULL DEFAULT 'not_started',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT goal_completed_has_timestamp CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX goal_worker ON goal (worker_id, status);

CREATE TABLE task (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  description text NOT NULL,
  done        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_worker ON task (worker_id, done);

CREATE TABLE note (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX note_worker ON note (worker_id, created_at DESC);
