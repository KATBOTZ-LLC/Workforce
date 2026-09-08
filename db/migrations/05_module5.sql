-- =====================================================================
-- Module 5 · Attendance and leave
-- Generated from WF-001_Schema_Blueprint.docx — do not hand-edit column lists.
-- =====================================================================

-- ATTENDANCE_RECORD — What one person did on one day.
-- HISTORICAL — accumulates indefinitely, never pruned during employment
CREATE TABLE attendance_record (
    attendance_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    record_date                      date NOT NULL,
    status                           text NOT NULL,
    leave_id                         uuid,
    clock_in_at                      timestamptz,
    clock_out_at                     timestamptz,
    source                           text NOT NULL,
    place                            text
);

-- LEAVE_REQUEST — A request for leave and its decision.
-- HISTORICAL — a decided request is never edited; a change is a new request
CREATE TABLE leave_request (
    leave_id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    leave_type                       text NOT NULL,
    category                         text,
    start_date                       date NOT NULL,
    end_date                         date NOT NULL,
    remark                           text,
    status                           text NOT NULL,
    decided_by_person_id             uuid,
    decided_at                       timestamptz
);

-- LEAVE_ENTITLEMENT — How much leave of one category one engagement has, in one year.
-- Current state
CREATE TABLE leave_entitlement (
    entitlement_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_id                    uuid NOT NULL,
    category                         text NOT NULL,
    year                             integer NOT NULL,
    entitled_days                    numeric(10,2),
    accrued_days                     numeric(10,2),
    carried_over_days                numeric(10,2)
);

-- HOLIDAY_CALENDAR — A company holiday, per region. A holiday is not leave.
-- Current state
CREATE TABLE holiday_calendar (
    holiday_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    region                           text NOT NULL,
    holiday_date                     date NOT NULL,
    name                             text NOT NULL
);
