-- 20261005a_search: searches, their places and combinations, hotels, offers
-- and the provider cache (architektur.md 5.3, 5.4). Offers carry a unique key
-- (combination, hotel, kind) so repeated workflow steps write idempotently.

CREATE TABLE IF NOT EXISTS app.searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'reviewing', 'done', 'partial', 'failed')),
  request jsonb NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  combos_total integer NOT NULL CHECK (combos_total > 0),
  combos_done integer NOT NULL DEFAULT 0 CHECK (combos_done >= 0),
  combos_failed integer NOT NULL DEFAULT 0 CHECK (combos_failed >= 0),
  workflow_instance_id text,
  ip_hash text,
  error text CHECK (error IS NULL OR length(error) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  CHECK (combos_done + combos_failed <= combos_total)
);
CREATE INDEX IF NOT EXISTS searches_created_at ON app.searches (created_at);

CREATE TABLE IF NOT EXISTS app.search_places (
  search_id uuid NOT NULL REFERENCES app.searches (id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES app.places (id),
  drive_minutes integer CHECK (drive_minutes IS NULL OR drive_minutes >= 0),
  source text NOT NULL CHECK (source IN ('suggested', 'user')),
  sort integer NOT NULL DEFAULT 0,
  PRIMARY KEY (search_id, place_id)
);

CREATE TABLE IF NOT EXISTS app.search_combinations (
  id bigserial PRIMARY KEY,
  search_id uuid NOT NULL REFERENCES app.searches (id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES app.places (id),
  checkin date NOT NULL,
  checkout date NOT NULL CHECK (checkout > checkin),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cached', 'failed')),
  offers_count integer NOT NULL DEFAULT 0 CHECK (offers_count >= 0),
  error text CHECK (error IS NULL OR length(error) <= 200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (search_id, place_id, checkin, checkout)
);
CREATE INDEX IF NOT EXISTS search_combinations_search ON app.search_combinations (search_id, id);

CREATE TABLE IF NOT EXISTS app.hotels (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  city text,
  country_code text,
  lat double precision,
  lng double precision,
  stars numeric(2, 1) CHECK (stars IS NULL OR (stars >= 0 AND stars <= 5)),
  rating numeric(4, 2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10)),
  review_count integer CHECK (review_count IS NULL OR review_count >= 0),
  hotel_type text,
  main_photo_url text,
  facility_ids integer[] NOT NULL DEFAULT '{}',
  content_fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.offers (
  id bigserial PRIMARY KEY,
  search_id uuid NOT NULL REFERENCES app.searches (id) ON DELETE CASCADE,
  combination_id bigint NOT NULL REFERENCES app.search_combinations (id) ON DELETE CASCADE,
  hotel_id text NOT NULL REFERENCES app.hotels (id),
  offer_kind text NOT NULL CHECK (offer_kind IN ('cheapest', 'cheapest_refundable')),
  liteapi_offer_id text NOT NULL,
  room_name text NOT NULL,
  board_type text NOT NULL CHECK (board_type IN ('RO', 'BB', 'HB', 'FB', 'AI', 'OTHER')),
  refundable boolean NOT NULL,
  free_cancel_until timestamptz,
  total_price_cents integer NOT NULL CHECK (total_price_cents > 0),
  pay_at_property_cents integer NOT NULL DEFAULT 0 CHECK (pay_at_property_cents >= 0),
  pay_at_property_known boolean NOT NULL,
  currency char(3) NOT NULL,
  nights integer NOT NULL CHECK (nights > 0),
  price_per_night_cents integer NOT NULL CHECK (price_per_night_cents > 0),
  passes_filters boolean NOT NULL DEFAULT true,
  quality_score numeric(4, 2),
  score_breakdown jsonb,
  bargain_types text[] NOT NULL DEFAULT '{}',
  bargain_reason text,
  rank_score numeric(10, 6),
  UNIQUE (combination_id, hotel_id, offer_kind)
);
CREATE INDEX IF NOT EXISTS offers_search ON app.offers (search_id);

CREATE TABLE IF NOT EXISTS app.cache_entries (
  namespace text NOT NULL CHECK (namespace IN ('rates', 'reference_price', 'hotel_content')),
  key text NOT NULL CHECK (key ~ '^[0-9a-f]{64}$'),
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (namespace, key)
);
CREATE INDEX IF NOT EXISTS cache_entries_expires ON app.cache_entries (expires_at);

ALTER TABLE app.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.search_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.search_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.cache_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.searches, app.search_places, app.search_combinations, app.hotels, app.offers, app.cache_entries
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE app.search_combinations_id_seq, app.offers_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.searches, app.search_places, app.search_combinations, app.hotels, app.offers, app.cache_entries
  TO app_rw;
GRANT USAGE, SELECT ON SEQUENCE app.search_combinations_id_seq, app.offers_id_seq TO app_rw;

DROP POLICY IF EXISTS searches_app_rw ON app.searches;
CREATE POLICY searches_app_rw ON app.searches FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS search_places_app_rw ON app.search_places;
CREATE POLICY search_places_app_rw ON app.search_places FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS search_combinations_app_rw ON app.search_combinations;
CREATE POLICY search_combinations_app_rw ON app.search_combinations FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hotels_app_rw ON app.hotels;
CREATE POLICY hotels_app_rw ON app.hotels FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS offers_app_rw ON app.offers;
CREATE POLICY offers_app_rw ON app.offers FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS cache_entries_app_rw ON app.cache_entries;
CREATE POLICY cache_entries_app_rw ON app.cache_entries FOR ALL TO app_rw USING (true) WITH CHECK (true);
