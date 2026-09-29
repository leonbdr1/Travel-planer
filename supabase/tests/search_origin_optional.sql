-- Optional start location (20261017a): a search without origin coordinates is
-- valid, one with them keeps working.
BEGIN;
SELECT plan(3);

SELECT col_is_null('app', 'searches', 'origin_lat', 'origin_lat may be empty');
SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
  VALUES ('00000000-0000-0000-0000-00000000c001', repeat('e', 64), '{}'::jsonb, NULL, NULL, 1)
$$, 'app_rw stores a search without origin');
SELECT lives_ok($$
  INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
  VALUES ('00000000-0000-0000-0000-00000000c002', repeat('f', 64), '{}'::jsonb, 48.78, 9.18, 1)
$$, 'a search with origin stays valid');

SELECT * FROM finish();
ROLLBACK;
