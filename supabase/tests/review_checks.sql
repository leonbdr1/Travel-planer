-- Review checks: status and value constraints, one check per hotel,
-- transient snippets bounded and removed with their search; app_rw only.
BEGIN;
SELECT plan(8);

INSERT INTO app.hotels (id, name) VALUES ('lp-review-1', 'Rezensionshaus');
INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
VALUES ('00000000-0000-0000-0000-00000000b001', repeat('d', 64), '{}'::jsonb, 48.78, 9.18, 1);

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, latest_review_date, recent_rating, recent_count, topics, skill_version, expires_at)
  VALUES ('lp-review-1', 'ok', 42, '2026-09-10', 7.4, 18,
          '[{"topic":"schimmel","confirmed_count":3,"unverified_count":0,"recent_count":3,"latest_date":"2026-09-10","severity":"high"}]',
          '1.0.0', now() + interval '30 days')
$$, 'app_rw stores a review check');
SELECT throws_ok($$
  INSERT INTO app.review_checks (hotel_id, status, expires_at) VALUES ('lp-review-1', 'ok', now() + interval '1 day')
$$, '23505', NULL, 'one review check per hotel');
SELECT throws_ok($$UPDATE app.review_checks SET status = 'maybe' WHERE hotel_id = 'lp-review-1'$$, '23514', NULL,
  'review check status is constrained');
SELECT throws_ok($$UPDATE app.review_checks SET recent_rating = 11 WHERE hotel_id = 'lp-review-1'$$, '23514', NULL,
  'recent rating stays on the 0–10 scale');
SELECT throws_ok($$UPDATE app.review_checks SET topics = '{}'::jsonb WHERE hotel_id = 'lp-review-1'$$, '23514', NULL,
  'topics are a JSON array');
SELECT lives_ok($$
  INSERT INTO app.review_check_pending (search_id, hotel_id, scan, snippets, expires_at)
  VALUES ('00000000-0000-0000-0000-00000000b001', 'lp-review-1', '{"analyzed":42}',
          '[{"id":"s1","topicHint":"schimmel","date":"2026-09-10","lang":"de","text":"Schimmel im Bad."}]', now() + interval '1 day')
$$, 'app_rw stores pending snippets for a search');
SELECT throws_ok($$
  UPDATE app.review_check_pending SET snippets = '[]'::jsonb WHERE hotel_id = 'lp-review-1'
$$, '23514', NULL, 'pending rows carry 1 to 25 snippets');
DELETE FROM app.searches WHERE id = '00000000-0000-0000-0000-00000000b001';
SELECT is((SELECT count(*)::int FROM app.review_check_pending WHERE hotel_id = 'lp-review-1'), 0,
  'deleting a search removes its pending snippets');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
