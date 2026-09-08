-- =====================================================================
-- Security. From "Sensitive data, and the control on each".
--
-- The append-only claim in the blueprint is made TRUE here. A schema note
-- cannot make that claim; a revoked permission can.
--
-- Everything is conditional on the wf_app role existing, so this file is a
-- no-op (with a warning) on a managed platform that would not let
-- 00_extensions.sql create it.
-- =====================================================================

DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wf_app') THEN
    RAISE WARNING '=====================================================';
    RAISE WARNING 'Role wf_app does not exist, so NO grants were applied.';
    RAISE WARNING 'The audit tables are NOT append-only on this database.';
    RAISE WARNING 'Create a non-owning role for the application, then re-run';
    RAISE WARNING 'this file, before treating the audit trail as tamper-proof.';
    RAISE WARNING '=====================================================';
    RETURN;
END IF;

EXECUTE 'GRANT USAGE ON SCHEMA public TO wf_app';
EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wf_app';
EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wf_app';

-- Rule: audit is append-only for every tier including founder.
-- The application role may add rows and read them. It may not change or remove
-- them, because the permission does not exist to be used.
EXECUTE 'REVOKE UPDATE, DELETE ON audit_log           FROM wf_app';
EXECUTE 'REVOKE UPDATE, DELETE ON document_access_log FROM wf_app';
EXECUTE 'REVOKE UPDATE, DELETE ON data_export_log     FROM wf_app';

-- EXPIRY_ALERT: rows are never edited, but message_status is written once
-- delivery is accepted, so UPDATE is retained and DELETE is not.
EXECUTE 'REVOKE DELETE ON expiry_alert FROM wf_app';

-- RETENTION_ACTION is the proof that a deletion happened. It must outlive
-- everything it describes.
EXECUTE 'REVOKE UPDATE, DELETE ON retention_action FROM wf_app';

-- Future tables default to the same shape.
EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wf_app';

RAISE NOTICE 'Grants applied; audit tables are append-only for wf_app.';
END
$$;
