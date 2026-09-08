-- =====================================================================
-- Module 9 · Data lifecycle
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- MIGRATION_BATCH — One load of external data, with the reconciliation evidence.
-- HISTORICAL — permanent evidence that the load was correct
CREATE TABLE migration_batch (
    batch_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_description               text NOT NULL,
    loaded_by_person_id              uuid NOT NULL,
    source_row_count                 integer NOT NULL,
    loaded_row_count                 integer NOT NULL,
    rejected_row_count               integer NOT NULL,
    hr_signed_off_by_person_id       uuid,
    accepted_at                      timestamptz
);

-- RETENTION_ACTION — Proof that retention deletion happened, and the aggregate that survives it.
-- HISTORICAL — deliberately outlives the data it describes
CREATE TABLE retention_action (
    retention_id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_code                  text NOT NULL,
    worker_type                      text NOT NULL,
    department_name                  text NOT NULL,
    joined_on                        date NOT NULL,
    exited_on                        date,
    documents_deleted                integer NOT NULL,
    executed_at                      timestamptz NOT NULL
);
