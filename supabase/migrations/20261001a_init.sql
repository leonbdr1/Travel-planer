-- 20261001a_init: schema `app`, roles, RLS baseline ("anon = 0").
-- Idempotent (architektur.md 5.1). Roles are created NOLOGIN; the operator
-- sets LOGIN and passwords for app_rw / app_import per environment (O10.1).

CREATE SCHEMA IF NOT EXISTS app;

DO $$
BEGIN
  -- Supabase provides anon and authenticated; tests and local PGlite do not.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_import') THEN
    CREATE ROLE app_import NOLOGIN;
  END IF;
END
$$;

-- Nobody but the application roles may even see the schema.
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM anon, authenticated;
GRANT USAGE ON SCHEMA app TO app_rw, app_import;

-- Future objects: tables and sequences for app_rw, functions for nobody by
-- default (every RPC grants EXECUTE explicitly to app_rw).
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_rw;

-- Key-value table used by the health check (and later small runtime flags).
CREATE TABLE IF NOT EXISTS app.meta_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.meta_kv ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.meta_kv FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.meta_kv TO app_rw;
DROP POLICY IF EXISTS meta_kv_app_rw ON app.meta_kv;
CREATE POLICY meta_kv_app_rw ON app.meta_kv FOR ALL TO app_rw USING (true) WITH CHECK (true);

INSERT INTO app.meta_kv (key, value)
VALUES ('schema', '{"initialized": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
