-- Praise counts on review checks (20261011a): an array, empty by default,
-- written by app_rw only.
BEGIN;
SELECT plan(4);

INSERT INTO app.hotels (id, name) VALUES ('lp-praise-1', 'Lobhaus');

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, expires_at) VALUES ('lp-praise-1', 'ok', 40, now() + interval '30 days')
$$, 'a check without praise counts can be written');
SELECT is((SELECT praise FROM app.review_checks WHERE hotel_id = 'lp-praise-1'), '[]'::jsonb, 'praise defaults to an empty list');
SELECT lives_ok($$
  UPDATE app.review_checks SET praise = '[{"topic":"fruehstueck","praised":23,"criticized":2}]'::jsonb WHERE hotel_id = 'lp-praise-1'
$$, 'app_rw stores praise counts');
SELECT throws_ok($$UPDATE app.review_checks SET praise = '{}'::jsonb WHERE hotel_id = 'lp-praise-1'$$, '23514', NULL,
  'praise is a JSON array');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
