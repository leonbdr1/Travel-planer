-- Review age (20261013a): the check stores loaded and fresh review counts,
-- older checks without them stay valid, negative counts are refused.
BEGIN;
SELECT plan(4);

SELECT has_column('app', 'review_checks', 'fresh_count', 'review_checks has fresh_count');
INSERT INTO app.hotels (id, name) VALUES ('lp-age-1', 'Haus 1'), ('lp-age-2', 'Haus 2'), ('lp-age-3', 'Haus 3');
SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, recent_count, topics, praise, checked_at, expires_at, reviews_loaded, fresh_count)
  VALUES ('lp-age-1', 'ok', 40, 5, '[]'::jsonb, '[]'::jsonb, now(), now() + interval '30 days', 40, 10)
$$, 'app_rw stores loaded and fresh counts');
SELECT lives_ok($$
  INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, recent_count, topics, praise, checked_at, expires_at)
  VALUES ('lp-age-2', 'ok', 40, 5, '[]'::jsonb, '[]'::jsonb, now(), now() + interval '30 days')
$$, 'a check without them stays valid');
SELECT throws_ok($$
  INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, recent_count, topics, praise, checked_at, expires_at, fresh_count)
  VALUES ('lp-age-3', 'ok', 40, 5, '[]'::jsonb, '[]'::jsonb, now(), now() + interval '30 days', -1)
$$, '23514', NULL, 'negative counts are refused');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
