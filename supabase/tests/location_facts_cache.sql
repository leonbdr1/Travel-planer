-- Location facts cache (20261012a): the new namespace is accepted, unknown
-- ones still fail, and only app_rw writes.
BEGIN;
SELECT plan(3);

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.cache_entries (namespace, key, value, expires_at)
  VALUES ('location_facts', repeat('a', 64), '{"walk":{"bus":3},"gastro":4}'::jsonb, now() + interval '90 days')
$$, 'app_rw caches location facts');
SELECT throws_ok($$
  INSERT INTO app.cache_entries (namespace, key, value, expires_at) VALUES ('map_tiles', repeat('b', 64), '{}'::jsonb, now())
$$, '23514', NULL, 'unknown namespaces are still refused');
RESET ROLE;

SELECT lives_ok($$
  INSERT INTO app.cache_entries (namespace, key, value, expires_at) VALUES ('rates', repeat('c', 64), '{}'::jsonb, now())
$$, 'existing namespaces stay allowed');

SELECT * FROM finish();
ROLLBACK;
