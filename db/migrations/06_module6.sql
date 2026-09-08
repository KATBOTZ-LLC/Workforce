-- =====================================================================
-- Module 6 · Performance and milestones
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- PERFORMANCE_REVIEW — One monthly review round for one engagement.
-- HISTORICAL — superseded rounds remain visible
CREATE TABLE performance_review (
    review_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    period_month                     integer NOT NULL,
    period_year                      integer NOT NULL,
    current_stage                    text NOT NULL,
    is_finalized                     boolean NOT NULL,
    supersedes_review_id             uuid
);

-- PERFORMANCE_REVIEW_STAGE — One stage of one review round.
-- HISTORICAL — locked on submission
CREATE TABLE performance_review_stage (
    stage_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id                        uuid NOT NULL,
    stage_name                       text NOT NULL,
    reviewer_person_id               uuid,
    rating                           integer,
    feedback                         text,
    submitted_at                     timestamptz,
    is_locked                        boolean NOT NULL
);

-- MILESTONE_REVIEW — A 30, 60 or 90-day milestone review.
-- Current state
CREATE TABLE milestone_review (
    milestone_id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    milestone_type                   text NOT NULL,
    due_date                         date NOT NULL,
    completed_at                     timestamptz,
    rating                           integer,
    feedback                         text
);
