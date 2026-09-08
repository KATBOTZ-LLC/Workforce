-- =====================================================================
-- Module 1 · Core identity and org structure
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- DEPARTMENT — One department in the company tree.
-- Current state
CREATE TABLE department (
    department_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                             text NOT NULL,
    parent_department_id             uuid,
    is_root                          boolean NOT NULL,
    is_active                        boolean NOT NULL
);

-- ROLE — One seat in the org chart. Exists whether or not somebody holds it.
-- Current state
CREATE TABLE role (
    role_id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title                            text NOT NULL,
    department_id                    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    reports_to_role_id               uuid,
    base_tier                        text NOT NULL,
    is_active                        boolean NOT NULL
);

-- PERSON — The human being. Everything that belongs to the person rather than to any engagement.
-- Current state
CREATE TABLE person (
    person_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name                       text NOT NULL,
    last_name                        text,
    preferred_name                   text,
    gender                           text,
    date_of_birth                    date,
    nationality                      text,
    immigration_status               text,
    created_at                       timestamptz NOT NULL DEFAULT now()
);

-- PERSON_ROLE — Which seat a person holds, and when.
-- HISTORICAL — closed by setting valid_to, never overwritten
CREATE TABLE person_role (
    person_role_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    role_id                          uuid NOT NULL,
    is_primary                       boolean NOT NULL,
    valid_from                       date NOT NULL,
    valid_to                         date
);

-- PERSON_EMAIL — Email addresses, held as rows so one constraint enforces the FSD uniqueness rule.
-- Current state
CREATE TABLE person_email (
    email_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id                        uuid NOT NULL,
    email_type                       text NOT NULL,
    email                            text NOT NULL
);

-- EMPLOYMENT — One engagement of one person. Separate from Person because a person may be engaged more than once.
-- HISTORICAL — a re-engagement is a NEW row; both are retained
CREATE TABLE employment (
    employment_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_code                  text NOT NULL,
    person_id                        uuid NOT NULL,
    worker_type                      text NOT NULL,
    contractor_mode                  text,
    employment_type                  text,
    designation                      text NOT NULL,
    joined_on                        date NOT NULL,
    exited_on                        date,
    stage                            text NOT NULL,
    retention_due_on                 date GENERATED ALWAYS AS (((exited_on + INTERVAL '3 years'))::date) STORED
);

-- EMPLOYMENT_ASSIGNMENT — Where an engagement sits, and under whom. Effective-dated.
-- HISTORICAL — the source of truth for "which department was she in last March"
CREATE TABLE employment_assignment (
    assignment_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    department_id                    uuid NOT NULL,
    hr_lead_person_id                uuid,
    hr_lead_unresolved               text,
    work_location_id                 uuid NOT NULL,
    change_reason                    text,
    valid_from                       date NOT NULL,
    valid_to                         date
);

-- WORK_LOCATION — A place of work, and the region and time zone that follow from it.
-- Current state
CREATE TABLE work_location (
    work_location_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                             text NOT NULL,
    country                          text NOT NULL,
    region                           text NOT NULL,
    timezone                         text NOT NULL
);
