-- =====================================================================
-- Module 4 · Eligibility engine
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- ELIGIBILITY_RULE — One rule. Pure configuration — no legal knowledge is coded into the product.
-- Current state
CREATE TABLE eligibility_rule (
    rule_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country                          text,
    visa_type                        text,
    employment_type                  text,
    paid_or_unpaid                   text,
    effect                           text NOT NULL,
    priority                         integer NOT NULL,
    is_overridable                   boolean NOT NULL,
    rule_set_version                 integer NOT NULL
);

-- ELIGIBILITY_DECISION — One recorded decision, with an immutable copy of what it was based on.
-- HISTORICAL — insert-only; a re-assessment is a new row
CREATE TABLE eligibility_decision (
    decision_id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    rule_set_version                 integer NOT NULL,
    result                           text NOT NULL,
    input_snapshot                   jsonb NOT NULL,
    overridden                       boolean NOT NULL,
    override_reason                  text,
    override_actor_id                uuid,
    override_otp_id                  uuid,
    decided_at                       timestamptz NOT NULL
);

-- ELIGIBILITY_DECISION_RULE — Which rules matched a decision. Every matched reason, not just the winner.
-- HISTORICAL — append-only
CREATE TABLE eligibility_decision_rule (
    id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id                      uuid NOT NULL,
    rule_id                          uuid NOT NULL,
    was_decisive                     boolean NOT NULL
);
