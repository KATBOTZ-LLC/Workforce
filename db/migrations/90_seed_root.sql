-- =====================================================================
-- The one row the schema itself depends on.
--
-- ROLE.department_id is ON DELETE SET DEFAULT so that deleting a department
-- moves its seats to the company root rather than deleting them. That
-- default has to point at a row that exists, with a fixed id.
-- =====================================================================
INSERT INTO department (department_id, name, is_root, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'KATBOTZ', true, true)
ON CONFLICT (department_id) DO NOTHING;
