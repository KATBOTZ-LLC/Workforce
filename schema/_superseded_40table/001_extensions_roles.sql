-- WF-001 Workforce Platform — 001 extensions, roles
-- PostgreSQL 14+ (the CYCLE clause in 012 requires 14).

CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive text: the email uniqueness rule
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid(), digest(), hmac() for identifier fields
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- EXCLUDE constraints mixing = with && (leave, visa overlap)
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- fuzzy name search in the directory

-- Least-privilege roles. The application connects as app_rw and can never
-- rewrite history: app_rw is granted INSERT only on the audit tables (013).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrate') THEN
    CREATE ROLE app_migrate NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS wf AUTHORIZATION app_migrate;
