-- WF-001 — 014 reference data (not employee data)
SET search_path = wf, public;

INSERT INTO org_unit (id, name, parent_id, is_root) VALUES ('unit_root','KATBOTZ',NULL,true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO leave_type (code, label, is_paid, entitlement_days, requires_remark) VALUES
  ('sick',        'Sick Leave',        true,  NULL, false),
  ('bereavement', 'Bereavement Leave', true,  NULL, false),
  ('pto',         'Paid Time Off',     true,  NULL, false),
  ('unpaid',      'Unpaid Leave',      false, NULL, true)
ON CONFLICT (code) DO NOTHING;
-- Entitlement, accrual and carry-over are deliberately NULL: pending Open Item 22.

INSERT INTO document_requirement (code, label, applies_type, applies_region, is_mandatory, allowed_types, max_bytes, validity_months) VALUES
  ('pan',            'PAN Card',                  NULL,      'IN', true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('aadhaar',        'Aadhaar',                   NULL,      'IN', true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('bank_proof',     'Bank Proof',                NULL,      NULL, true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('degree',         'Degree Certificate',        NULL,      NULL, true,  ARRAY['application/pdf'],                          10485760, NULL),
  ('marksheet_10',   '10th Marksheet',            NULL,      NULL, true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('marksheet_12',   '12th Marksheet',            NULL,      NULL, true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('student_id',     'Student Identity Document', 'Intern',  NULL, true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('us_tax_form',    'US Tax Withholding Form',   NULL,      'US', true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, 12),
  ('passport',       'Passport',                  NULL,      NULL, false, ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL),
  ('work_auth_proof','Work Authorization Evidence',NULL,     'US', true,  ARRAY['application/pdf','image/jpeg','image/png'],  5242880, NULL)
ON CONFLICT (code) DO NOTHING;
