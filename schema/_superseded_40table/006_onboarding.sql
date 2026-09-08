-- WF-001 — 006 tokenized onboarding link
SET search_path = wf, public;

-- Only the hash is stored, so a database leak yields no working links.
-- Recorded rather than self-contained, so a link can be revoked and reissued (Open Item 9).
CREATE TABLE onboarding_token (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    text NOT NULL REFERENCES worker(id) ON DELETE CASCADE,
  token_sha256 bytea NOT NULL UNIQUE,
  issued_at    timestamptz NOT NULL DEFAULT now(),
  issued_by    text NOT NULL,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  last_used_at timestamptz,
  use_count    integer NOT NULL DEFAULT 0,
  CONSTRAINT onboarding_token_expiry_after_issue CHECK (expires_at > issued_at)
);
-- At most one live token per worker.
CREATE UNIQUE INDEX onboarding_token_one_live_per_worker
  ON onboarding_token (worker_id) WHERE revoked_at IS NULL;
CREATE INDEX onboarding_token_expiry ON onboarding_token (expires_at) WHERE revoked_at IS NULL;
