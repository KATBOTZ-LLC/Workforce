-- WF-001 — 011 notifications, outbox, one-time codes, rate limiting, audit
SET search_path = wf, public;

CREATE TABLE notification (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  text NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  event      text NOT NULL,
  body       text NOT NULL,
  link       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX notification_unread ON notification (person_id, created_at DESC) WHERE read_at IS NULL;

-- Transactional outbox: a message is enqueued in the same transaction as the change it
-- announces, so "notified but not saved" cannot happen (FSD section 5).
CREATE TABLE outbox (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         outbox_kind NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  attempts     integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error   text
);
CREATE INDEX outbox_pending ON outbox (next_attempt_at) WHERE dispatched_at IS NULL;

-- One-time codes: single use, short expiry, attempt limit, lockout (FSD section 5).
CREATE TABLE otp_challenge (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    text NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  purpose      otp_purpose NOT NULL,
  code_sha256  bytea NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  attempts     integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  locked_until timestamptz,
  consumed_at  timestamptz,
  CONSTRAINT otp_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX otp_challenge_live ON otp_challenge (person_id, purpose) WHERE consumed_at IS NULL;

ALTER TABLE eligibility_override
  ADD CONSTRAINT eligibility_override_otp_fk
  FOREIGN KEY (otp_challenge_id) REFERENCES otp_challenge(id) ON DELETE RESTRICT;

-- Fixed-window counters. Bounded volume makes a separate store unjustified at this size.
CREATE TABLE rate_limit (
  bucket_key   text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

-- Append-only for EVERY user including the founder. Enforced by grant and trigger (012, 013),
-- not by application code, which is the only way the claim holds (FSD section 6).
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email citext,
  actor_tier  access_tier,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  summary     text NOT NULL,
  before_val  jsonb,
  after_val   jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity ON audit_log (entity_type, entity_id, at DESC);
CREATE INDEX audit_log_actor  ON audit_log (actor_email, at DESC);
CREATE INDEX audit_log_at     ON audit_log (at DESC);
