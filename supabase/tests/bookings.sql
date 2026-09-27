-- Bookings and outbox: reference format, status rules, guest data erasure,
-- outbox attempt bounds, the look-to-book ratio and bookings outliving
-- their search; everything through app_rw.
BEGIN;
SELECT plan(12);

INSERT INTO app.hotels (id, name) VALUES ('lp-book-1', 'Buchungshaus');
INSERT INTO app.searches (id, token_hash, request, origin_lat, origin_lng, combos_total)
VALUES ('00000000-0000-0000-0000-00000000c001', repeat('a', 64), '{}'::jsonb, 48.78, 9.18, 1);

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.bookings (id, booking_ref, search_id, hotel_id, offer_snapshot, checkin, checkout, occupancy, total_price_cents, currency,
                            holder_first_name, holder_last_name, holder_email)
  VALUES ('00000000-0000-0000-0000-0000000b0001', 'K7M2Q9XZ', '00000000-0000-0000-0000-00000000c001', 'lp-book-1', '{}', '2026-10-02', '2026-10-04',
          '[{"adults":2,"childrenAges":[]}]', 21200, 'EUR', 'Max', 'Muster', 'max@example.org')
$$, 'app_rw creates a booking draft');
SELECT throws_ok($$
  INSERT INTO app.bookings (booking_ref, hotel_id, offer_snapshot, checkin, checkout, occupancy, total_price_cents, currency, holder_first_name, holder_last_name, holder_email)
  VALUES ('ILOU1234', 'lp-book-1', '{}', '2026-10-02', '2026-10-04', '[]', 100, 'EUR', 'A', 'B', 'a@example.org')
$$, '23514', NULL, 'booking references use Crockford Base32 (no I, L, O, U)');
SELECT throws_ok($$
  INSERT INTO app.bookings (booking_ref, hotel_id, offer_snapshot, checkin, checkout, occupancy, total_price_cents, currency, holder_first_name, holder_last_name, holder_email)
  VALUES ('K7M2Q9XZ', 'lp-book-1', '{}', '2026-10-02', '2026-10-04', '[]', 100, 'EUR', 'A', 'B', 'a@example.org')
$$, '23505', NULL, 'booking references are unique');
SELECT throws_ok($$UPDATE app.bookings SET status = 'paid' WHERE booking_ref = 'K7M2Q9XZ'$$, '23514', NULL, 'booking status is constrained');
SELECT throws_ok($$UPDATE app.bookings SET status = 'confirmed' WHERE booking_ref = 'K7M2Q9XZ'$$, '23514', NULL,
  'confirmed needs a LiteAPI booking id and a confirmation time');
SELECT lives_ok($$
  UPDATE app.bookings SET status = 'confirmed', liteapi_booking_id = 'B1', hotel_confirmation_code = 'HCN-1', confirmed_at = now()
   WHERE booking_ref = 'K7M2Q9XZ'
$$, 'confirmed with booking id and time');
SELECT throws_ok($$UPDATE app.bookings SET holder_email = NULL WHERE booking_ref = 'K7M2Q9XZ'$$, '23514', NULL,
  'guest data can only be removed together with pii_deleted_at');
SELECT lives_ok($$
  UPDATE app.bookings SET holder_first_name = NULL, holder_last_name = NULL, holder_email = NULL, holder_phone = NULL, guests = NULL, pii_deleted_at = now()
   WHERE booking_ref = 'K7M2Q9XZ'
$$, 'guest data is erased while the booking stays');
SELECT throws_ok($$
  INSERT INTO app.email_outbox (type, to_email, attempts) VALUES ('access_link', 'a@example.org', 6)
$$, '23514', NULL, 'at most 5 send attempts');
SELECT throws_ok($$
  INSERT INTO app.email_outbox (type, to_email, status) VALUES ('access_link', 'a@example.org', 'sent')
$$, '23514', NULL, 'sent needs a provider message id and a send time');
INSERT INTO app.provider_usage (day, provider, endpoint, calls) VALUES ((now() AT TIME ZONE 'UTC')::date, 'liteapi', 'hotels/rates', 100)
ON CONFLICT (day, provider, endpoint) DO UPDATE SET calls = 100;
SELECT is(app.look_to_book_ratio(7), 100::numeric, 'look-to-book: 100 rate requests per 1 confirmed booking');
DELETE FROM app.searches WHERE id = '00000000-0000-0000-0000-00000000c001';
SELECT is((SELECT count(*)::int FROM app.bookings WHERE booking_ref = 'K7M2Q9XZ' AND search_id IS NULL), 1,
  'bookings outlive their search');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
