-- 20261008a_bookings: bookings with their state machine, the e-mail outbox
-- and the look-to-book ratio (architektur.md 5.6, 5.7, 6.11).
--
-- LiteAPI ids (prebook, transaction, booking) are written and read only by
-- the server. Guest data (holder, guests) can be erased per booking
-- (pii_deleted_at) while the booking record stays.

CREATE TABLE IF NOT EXISTS app.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE CHECK (booking_ref ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  search_id uuid REFERENCES app.searches (id) ON DELETE SET NULL,
  hotel_id text NOT NULL REFERENCES app.hotels (id),
  offer_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'prebooked', 'booking', 'confirmed', 'failed', 'cancelled')),
  liteapi_prebook_id text,
  liteapi_transaction_id text,
  liteapi_booking_id text,
  hotel_confirmation_code text,
  checkin date NOT NULL,
  checkout date NOT NULL CHECK (checkout > checkin),
  occupancy jsonb NOT NULL,
  total_price_cents integer NOT NULL CHECK (total_price_cents > 0),
  currency char(3) NOT NULL,
  price_changed boolean NOT NULL DEFAULT false,
  price_confirmed_at timestamptz,
  cancellation_policy jsonb,
  cancellation_fee_cents integer CHECK (cancellation_fee_cents IS NULL OR cancellation_fee_cents >= 0),
  refund_cents integer CHECK (refund_cents IS NULL OR refund_cents >= 0),
  holder_first_name text CHECK (holder_first_name IS NULL OR length(holder_first_name) <= 100),
  holder_last_name text CHECK (holder_last_name IS NULL OR length(holder_last_name) <= 100),
  holder_email text CHECK (holder_email IS NULL OR length(holder_email) <= 254),
  holder_phone text CHECK (holder_phone IS NULL OR length(holder_phone) <= 40),
  guests jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  review_invite_sent_at timestamptz,
  pii_deleted_at timestamptz,
  last_error text CHECK (last_error IS NULL OR length(last_error) <= 200),
  CHECK (status NOT IN ('confirmed', 'cancelled') OR (liteapi_booking_id IS NOT NULL AND confirmed_at IS NOT NULL)),
  CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CHECK (pii_deleted_at IS NOT NULL OR (holder_first_name IS NOT NULL AND holder_last_name IS NOT NULL AND holder_email IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS bookings_confirmed_at ON app.bookings (confirmed_at);
CREATE INDEX IF NOT EXISTS bookings_checkout ON app.bookings (checkout);

CREATE TABLE IF NOT EXISTS app.email_outbox (
  id bigserial PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('booking_confirmation', 'booking_cancelled', 'access_link', 'review_invite', 'ops_alert')),
  to_email text NOT NULL CHECK (length(to_email) <= 254),
  booking_id uuid REFERENCES app.bookings (id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  last_error text CHECK (last_error IS NULL OR length(last_error) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CHECK (status <> 'sent' OR (sent_at IS NOT NULL AND provider_message_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS email_outbox_due ON app.email_outbox (status, next_attempt_at);

ALTER TABLE app.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.bookings, app.email_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE app.email_outbox_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.bookings, app.email_outbox TO app_rw;
GRANT USAGE, SELECT ON SEQUENCE app.email_outbox_id_seq TO app_rw;

DROP POLICY IF EXISTS bookings_app_rw ON app.bookings;
CREATE POLICY bookings_app_rw ON app.bookings FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS email_outbox_app_rw ON app.email_outbox;
CREATE POLICY email_outbox_app_rw ON app.email_outbox FOR ALL TO app_rw USING (true) WITH CHECK (true);

-- Rate requests per confirmed booking over the last p_days days (the
-- look-to-book watch, architektur.md 6.4 step 10). Without bookings the
-- divisor is 1, so the value equals the number of rate requests.
CREATE OR REPLACE FUNCTION app.look_to_book_ratio(p_days int)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = app, pg_temp
AS $$
  SELECT (
    SELECT coalesce(sum(calls), 0) FROM app.provider_usage
     WHERE provider = 'liteapi' AND endpoint = 'hotels/rates'
       AND day > (now() AT TIME ZONE 'UTC')::date - p_days
  )::numeric / greatest(1, (
    SELECT count(*) FROM app.bookings
     WHERE confirmed_at IS NOT NULL AND confirmed_at > now() - make_interval(days => p_days)
  ))
$$;
REVOKE ALL ON FUNCTION app.look_to_book_ratio(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.look_to_book_ratio(int) TO app_rw;
