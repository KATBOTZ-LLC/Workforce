-- WF-001 — 003 organization structure
-- The organization chart is the single source of truth for access (FSD section 6).
SET search_path = wf, public;

CREATE TABLE person (
  id           text PRIMARY KEY,                       -- e.g. person_ashish_katyayan
  display_name text        NOT NULL,
  email        citext      UNIQUE,                     -- case-insensitive by type, not by index
  aliases      text[]      NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_display_name_not_blank CHECK (btrim(display_name) <> '')
);
COMMENT ON TABLE person IS
  'A human being. Referenced by surrogate key everywhere, so renaming is one UPDATE and no reference cascades (FSD test 8).';

CREATE TABLE org_unit (
  id        text PRIMARY KEY,                          -- e.g. unit_hr
  name      text NOT NULL,
  parent_id text REFERENCES org_unit(id) ON DELETE RESTRICT,
  is_root   boolean NOT NULL DEFAULT false,
  CONSTRAINT org_unit_root_has_no_parent CHECK ((is_root AND parent_id IS NULL) OR (NOT is_root AND parent_id IS NOT NULL))
);
-- Exactly one root, and it can never be deleted (trigger in 012).
CREATE UNIQUE INDEX org_unit_single_root ON org_unit ((is_root)) WHERE is_root;

CREATE TABLE org_role (
  id         text PRIMARY KEY,                         -- e.g. role_ceo
  person_id  text REFERENCES person(id) ON DELETE SET NULL,   -- NULL = vacant
  unit_id    text NOT NULL REFERENCES org_unit(id) ON DELETE SET DEFAULT,
  level      smallint NOT NULL CHECK (level BETWEEN 0 AND 4),
  title      text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false
);
-- Deleting a unit moves its roles to the company root; none are lost (FSD test 11).
ALTER TABLE org_role ALTER COLUMN unit_id SET DEFAULT 'unit_root';

-- One primary role per person.
CREATE UNIQUE INDEX org_role_one_primary_per_person ON org_role (person_id) WHERE is_primary AND person_id IS NOT NULL;
CREATE INDEX org_role_unit_level        ON org_role (unit_id, level);
CREATE INDEX org_role_person            ON org_role (person_id);

CREATE TABLE org_edge (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role_id text NOT NULL REFERENCES org_role(id) ON DELETE CASCADE,
  to_role_id   text NOT NULL REFERENCES org_role(id) ON DELETE CASCADE,
  type         edge_type NOT NULL DEFAULT 'reports_to',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_edge_no_self CHECK (from_role_id <> to_role_id),          -- FSD section 5
  CONSTRAINT org_edge_unique UNIQUE (from_role_id, to_role_id, type)       -- duplicate relationships refused
);
CREATE INDEX org_edge_from ON org_edge (from_role_id);
CREATE INDEX org_edge_to   ON org_edge (to_role_id);

-- Login activity. Identity itself lives in person; this records sessions only.
CREATE TABLE app_user (
  email           citext PRIMARY KEY,
  person_id       text REFERENCES person(id) ON DELETE SET NULL,
  name            text,
  picture_url     text,
  last_login      timestamptz,
  session_version integer NOT NULL DEFAULT 1     -- bumped to invalidate every issued session (Open Item 11)
);
