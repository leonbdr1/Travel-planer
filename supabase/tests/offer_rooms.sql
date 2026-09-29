-- Offer rooms (20261015a): an offer stores its room fit, size and the room
-- list; older writes without them count as fitting; unknown fits are refused.
BEGIN;
SELECT plan(5);

SELECT has_column('app', 'offers', 'room_fit', 'offers has room_fit');
INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
VALUES (990201, 'Zimmerdorf', 'Zimmerdorf', 'DE', '02', 47.5, 10.5, 1500, 'PPL', 'zimmerdorf');
INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
VALUES ('ort-990201-zimmerdorf', 'Zimmerdorf', 990201, 'DE', 47.5, 10.5, 'user', false);

SET LOCAL ROLE app_rw;
INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
VALUES ('00000000-0000-0000-0000-00000000b001', repeat('d', 64), '{}'::jsonb, 48.78, 9.18, 1);
INSERT INTO app.search_combinations (search_id, place_id, checkin, checkout)
SELECT '00000000-0000-0000-0000-00000000b001', id, '2026-10-02', '2026-10-04' FROM app.places WHERE slug = 'ort-990201-zimmerdorf';
INSERT INTO app.hotels (id, name) VALUES ('lp-room-1', 'Zimmerhaus'), ('lp-room-2', 'Altes Haus');
SELECT lives_ok($$
  INSERT INTO app.offers (search_id, combination_id, hotel_id, offer_kind, liteapi_offer_id, room_name, board_type, refundable,
                          total_price_cents, pay_at_property_known, currency, nights, price_per_night_cents, room_fit, room_capacity, room_options)
  SELECT '00000000-0000-0000-0000-00000000b001', id, 'lp-room-1', 'cheapest', 'r1', 'Chalet', 'RO', true, 30000, true, 'EUR', 2, 15000,
         'oversized', 8, '[{"roomName":"Chalet","totalCents":30000,"capacity":8,"fit":"oversized"}]'::jsonb
    FROM app.search_combinations WHERE search_id = '00000000-0000-0000-0000-00000000b001'
$$, 'app_rw stores fit, size and room list');
SELECT lives_ok($$
  INSERT INTO app.offers (search_id, combination_id, hotel_id, offer_kind, liteapi_offer_id, room_name, board_type, refundable,
                          total_price_cents, pay_at_property_known, currency, nights, price_per_night_cents)
  SELECT '00000000-0000-0000-0000-00000000b001', id, 'lp-room-2', 'cheapest', 'r2', 'Doppelzimmer', 'RO', true, 20000, true, 'EUR', 2, 10000
    FROM app.search_combinations WHERE search_id = '00000000-0000-0000-0000-00000000b001'
$$, 'a write without them stays valid');
SELECT is((SELECT room_fit FROM app.offers WHERE liteapi_offer_id = 'r2'), 'fits', 'without a fit the offer counts as fitting');
SELECT throws_ok($$UPDATE app.offers SET room_fit = 'tiny' WHERE liteapi_offer_id = 'r2'$$, '23514', NULL, 'room fit is constrained');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
