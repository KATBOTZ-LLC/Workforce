-- =====================================================================
-- DEMO DATA — four engagements, so the roster is not empty after a rebuild.
--
-- NOT in db/migrations/, so ./db/migrate.sh never applies it by accident.
-- Apply deliberately with:  ./db/migrate.sh --demo
--
-- These four people are INVENTED. Every other seeded row is real KATBOTZ data.
-- They exist to show the checklist branching: same worker type and engagement
-- mode in a different region gets a different checklist.
-- =====================================================================

-- One helper, used four times: create the person, the email, the engagement,
-- the placement, the frozen checklist and an onboarding token, exactly as
-- backend/app/employees.py does it.
CREATE OR REPLACE FUNCTION demo_onboard(
    p_first text, p_last text, p_email text, p_type text, p_mode text,
    p_designation text, p_department text, p_location text, p_joined date
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    v_person uuid; v_employment uuid; v_code text; v_region text;
    v_dept uuid; v_loc uuid; v_docs int;
BEGIN
    SELECT department_id INTO v_dept FROM department WHERE name = p_department AND is_active;
    SELECT work_location_id, region INTO v_loc, v_region FROM work_location WHERE name = p_location;
    IF v_dept IS NULL OR v_loc IS NULL THEN
        RAISE EXCEPTION 'demo_onboard: unknown department % or location %', p_department, p_location;
    END IF;

    INSERT INTO person (first_name, last_name, preferred_name)
    VALUES (p_first, p_last, concat_ws(' ', p_first, p_last))
    RETURNING person_id INTO v_person;

    INSERT INTO person_email (person_id, email_type, email)
    VALUES (v_person, 'professional', p_email);

    INSERT INTO employment (employment_code, person_id, worker_type, contractor_mode,
                            designation, joined_on, stage)
    VALUES ('EMP-' || lpad(nextval('employment_code_seq')::text, 3, '0'),
            v_person, p_type, p_mode, p_designation, p_joined, 'Invited')
    RETURNING employment_id, employment_code INTO v_employment, v_code;

    INSERT INTO employment_assignment (employment_id, department_id, work_location_id, valid_from)
    VALUES (v_employment, v_dept, v_loc, p_joined);

    -- is_mandatory is COPIED, so a later change to the requirement cannot move
    -- the activation gate under someone already onboarding.
    INSERT INTO worker_document (employment_id, requirement_id, is_mandatory, status)
    SELECT v_employment, r.requirement_id, r.is_mandatory, 'Outstanding'
      FROM document_requirement r
     WHERE (r.worker_type IS NULL OR r.worker_type = p_type)
       AND (r.region IS NULL OR r.region = v_region)
       AND (r.contractor_mode IS NULL OR r.contractor_mode = p_mode);
    GET DIAGNOSTICS v_docs = ROW_COUNT;

    -- A hash of a throwaway value. The demo links are not meant to work.
    INSERT INTO onboarding_token (employment_id, token_hash, issued_at, expires_at, status)
    VALUES (v_employment, encode(sha256((v_code || 'demo')::bytea), 'hex'),
            now(), now() + interval '7 days', 'active');

    RETURN format('%s  %-13s %-11s %-6s %s docs', v_code, p_first, p_type, v_region, v_docs);
END $$;

SELECT demo_onboard('Maya','Iyer','maya.iyer@katbotz.com','Intern',NULL,
                    'Data Science Intern','Innovation','United States','2026-09-15');
SELECT demo_onboard('Rohan','Mehta','rohan.mehta@katbotz.com','Employee',NULL,
                    'Backend Engineer','Innovation','India office','2026-09-22');
SELECT demo_onboard('Sunil','Rao','sunil.rao@katbotz.com','Contractor','c2c',
                    'SAP ABAP Consultant','Innovation','India office','2026-10-01');
SELECT demo_onboard('Elena','Petrova','elena.petrova@katbotz.com','Contractor','c2c',
                    'Solutions Architect','Innovation','United States','2026-10-06');

DROP FUNCTION demo_onboard(text,text,text,text,text,text,text,text,date);
