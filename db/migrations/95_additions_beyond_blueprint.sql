-- =====================================================================
-- ADDITIONS BEYOND THE APPROVED BLUEPRINT (37 tables / 267 columns).
-- Listed separately so the approved design stays auditable and every
-- departure from it is visible in one place.
-- =====================================================================

-- ROLE.level — the org matrix's visual band (0 executive .. 4 intern).
--
-- Why this is needed: the org chart screen lays seats out by band, and the
-- approved schema has nowhere to hold it. reports_to_role_id would be the
-- structural alternative, but the source records no reporting lines and
-- zero edges are populated, so level is currently the ONLY layout data
-- that exists. Without it the org chart cannot render.
--
-- It is a display band, not a reporting line, and nothing derives
-- permissions from it except the intern tier, which base_tier already
-- carries independently.
ALTER TABLE role ADD COLUMN level smallint;
ALTER TABLE role ADD CONSTRAINT ck_role_level
    CHECK (level IS NULL OR level BETWEEN 0 AND 4);
COMMENT ON COLUMN role.level IS
    'Org-matrix display band 0-4. Layout only. Addition beyond the approved blueprint.';

-- DOCUMENT_REQUIREMENT.reference_url — a link to the form the worker must fill.
--
-- Why this is needed: several real checklist items are not "upload a document
-- you already have" but "fill in this specific form" — the IRS W-9 and W-4 are
-- both live URLs in the current checklists. Without somewhere to keep the link,
-- onboarding would tell a worker to complete a form without saying which one.
--
-- It is configuration, not worker data: it belongs to the requirement, changes
-- when a tax form is reissued, and is the same for everyone it applies to.
ALTER TABLE document_requirement ADD COLUMN reference_url text;
ALTER TABLE document_requirement ADD CONSTRAINT ck_document_requirement_url
    CHECK (reference_url IS NULL OR reference_url ~ '^https://');
COMMENT ON COLUMN document_requirement.reference_url IS
    'Link to the form to complete, e.g. the IRS W-9. Addition beyond the approved blueprint.';

-- A sequence behind EMPLOYMENT.employment_code ("EMP-001").
--
-- Why: the code is the number people quote, and it is UNIQUE. Deriving it from
-- max(existing)+1 races — two HR users onboarding at the same moment would
-- compute the same code and one INSERT would fail. A sequence hands out
-- distinct values without either transaction waiting for the other.
--
-- Gaps are possible (a rolled-back onboarding consumes a number). That is the
-- correct trade: a gap in a reference code is harmless, a duplicate is not.
CREATE SEQUENCE IF NOT EXISTS employment_code_seq AS integer START 1;
GRANT USAGE, SELECT ON SEQUENCE employment_code_seq TO wf_app;
COMMENT ON SEQUENCE employment_code_seq IS
    'Feeds EMPLOYMENT.employment_code. Addition beyond the approved blueprint.';
