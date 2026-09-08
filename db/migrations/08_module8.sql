-- =====================================================================
-- Module 8 · Tasks and notes
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- TASK — A personal to-do item.
-- Current state
CREATE TABLE task (
    task_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    title                            text NOT NULL,
    description                      text,
    status                           text NOT NULL,
    due_date                         date
);

-- GOAL — A goal set for an engagement.
-- Current state
CREATE TABLE goal (
    goal_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    title                            text NOT NULL,
    description                      text,
    target_date                      date,
    status                           text NOT NULL
);

-- NOTE — A notebook entry.
-- Current state
CREATE TABLE note (
    note_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    content                          text NOT NULL,
    created_at                       timestamptz NOT NULL DEFAULT now()
);
