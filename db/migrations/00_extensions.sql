-- =====================================================================
-- Extensions and the application role.
--
-- Written to work on a local PostgreSQL AND on managed Postgres (Neon,
-- Supabase, Cloud SQL), where the connecting role is usually not a superuser
-- and may not be allowed to create roles at all.
-- =====================================================================

-- gen_random_uuid() is in core PostgreSQL from 13 onward, so pgcrypto is only
-- a fallback for older servers. Not fatal if the platform forbids it.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN insufficient_privilege OR feature_not_supported THEN
    RAISE NOTICE 'pgcrypto not installed (not permitted here). Fine on PostgreSQL 13+.';
END
$$;

-- Required: the directory's misspelling-tolerant search depends on it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- The role the application connects as.
--
-- It deliberately does NOT own the tables. That is the whole mechanism behind
-- the append-only guarantee on the audit tables: 80_security.sql revokes
-- UPDATE and DELETE from this role, and an owner could simply grant them back.
--
-- On a managed platform that forbids CREATE ROLE, this is skipped with a
-- warning rather than failing the migration. The schema still applies; the
-- append-only guarantee does not hold until a separate role exists. See
-- 80_security.sql, which says so again at the point it matters.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wf_app') THEN
        EXECUTE format(
            'CREATE ROLE wf_app LOGIN PASSWORD %L',
            coalesce(nullif(current_setting('wf.app_password', true), ''), 'wf_app_local_dev')
        );
        RAISE NOTICE 'Created role wf_app.';
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Cannot create role wf_app here (not permitted). The schema will '
                  'still apply, but the append-only guarantee on the audit tables '
                  'is NOT in force until the app connects as a non-owning role.';
END
$$;
