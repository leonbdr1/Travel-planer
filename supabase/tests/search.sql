-- Search tables: idempotent offer writes, status and combination
-- constraints, cascade on delete; everything through app_rw.
BEGIN;
SELECT plan(8);

INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
VALUES (990101, 'Suchdorf', 'Suchdorf', 'DE', '02', 47.5, 10.5, 1500, 'PPL', 'suchdorf');
INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
VALUES ('ort-990101-suchdorf', 'Suchdorf', 990101, 'DE', 47.5, 10.5, 'user', false);

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
  VALUES ('00000000-0000-0000-0000-00000000a001', repeat('c', 64), '{}'::jsonb, 48.78, 9.18, 2)
$$, 'app_rw creates a search');
SELECT lives_ok($$
  INSERT INTO app.search_combinations (search_id, place_id, checkin, checkout)
  SELECT '00000000-0000-0000-0000-00000000a001', id, '2026-10-02', '2026-10-04' FROM app.places WHERE slug = 'ort-990101-suchdorf'
$$, 'app_rw creates combinations');
SELECT lives_ok($$INSERT INTO app.hotels (id, name) VALUES ('lp-test-1', 'Testhaus')$$, 'app_rw upserts hotels');
SELECT lives_ok($$
  INSERT INTO app.offers (search_id, combination_id, hotel_id, offer_kind, liteapi_offer_id, room_name, board_type, refundable,
                          total_price_cents, pay_at_property_known, currency, nights, price_per_night_cents)
  SELECT '00000000-0000-0000-0000-00000000a001', id, 'lp-test-1', 'cheapest', 'o1', 'Doppelzimmer', 'BB', true, 21200, true, 'EUR', 2, 10600
    FROM app.search_combinations WHERE search_id = '00000000-0000-0000-0000-00000000a001'
$$, 'app_rw writes an offer');
SELECT throws_ok($$
  INSERT INTO app.offers (search_id, combination_id, hotel_id, offer_kind, liteapi_offer_id, room_name, board_type, refundable,
                          total_price_cents, pay_at_property_known, currency, nights, price_per_night_cents)
  SELECT '00000000-0000-0000-0000-00000000a001', id, 'lp-test-1', 'cheapest', 'o2', 'Doppelzimmer', 'BB', true, 19900, true, 'EUR', 2, 9950
    FROM app.search_combinations WHERE search_id = '00000000-0000-0000-0000-00000000a001'
$$, '23505', NULL, 'the same combination, hotel and kind cannot be written twice');
SELECT throws_ok($$UPDATE app.searches SET status = 'lost' WHERE id = '00000000-0000-0000-0000-00000000a001'$$, '23514', NULL,
  'search status is constrained');
SELECT throws_ok($$UPDATE app.searches SET combos_done = 3 WHERE id = '00000000-0000-0000-0000-00000000a001'$$, '23514', NULL,
  'progress cannot exceed the number of combinations');
DELETE FROM app.searches WHERE id = '00000000-0000-0000-0000-00000000a001';
SELECT is((SELECT count(*)::int FROM app.offers WHERE liteapi_offer_id = 'o1'), 0, 'deleting a search removes its offers');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
