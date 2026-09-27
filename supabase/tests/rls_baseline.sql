-- RLS baseline ("anon = 0", architektur.md 5.1): anon and authenticated can
-- neither read nor write anything in schema app; app_rw can do both.
-- The generic checks cover every table, including those added by later
-- migrations, so a new table without RLS or with a stray grant fails here.
BEGIN;
SELECT plan(12);

SELECT is(
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'app' AND NOT rowsecurity),
  0,
  'RLS is enabled on every table in schema app'
);

SELECT is(
  (SELECT count(*)::int FROM information_schema.role_table_grants
    WHERE table_schema = 'app' AND grantee IN ('anon', 'authenticated', 'PUBLIC')),
  0,
  'no table in schema app is granted to anon, authenticated or PUBLIC'
);

SELECT ok(NOT has_schema_privilege('anon', 'app', 'USAGE'), 'anon has no USAGE on schema app');
SELECT ok(NOT has_schema_privilege('authenticated', 'app', 'USAGE'), 'authenticated has no USAGE on schema app');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  0,
  'no function in schema app is executable by anon or authenticated'
);

SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM app.meta_kv', '42501', NULL, 'anon cannot read app.meta_kv');
SELECT throws_ok($$INSERT INTO app.meta_kv (key, value) VALUES ('probe', '{}')$$, '42501', NULL,
  'anon cannot write app.meta_kv');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM app.meta_kv', '42501', NULL, 'authenticated cannot read app.meta_kv');
SELECT throws_ok($$UPDATE app.meta_kv SET value = '{}'$$, '42501', NULL, 'authenticated cannot update app.meta_kv');
RESET ROLE;

SET LOCAL ROLE app_rw;
SELECT lives_ok($$INSERT INTO app.meta_kv (key, value) VALUES ('rls_probe', '{"ok": true}')$$,
  'app_rw can write app.meta_kv');
SELECT is((SELECT value->>'ok' FROM app.meta_kv WHERE key = 'rls_probe'), 'true', 'app_rw can read app.meta_kv');
SELECT lives_ok($$DELETE FROM app.meta_kv WHERE key = 'rls_probe'$$, 'app_rw can delete from app.meta_kv');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
