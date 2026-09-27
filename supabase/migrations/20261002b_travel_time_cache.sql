-- 20261002b_travel_time_cache: drive times per origin cell (≈2 km grid) and
-- place, TTL 180 days (architektur.md 5.2). No FK to app.places: it is a
-- cache, and the catalog tables arrive later (20261003c_catalog).

CREATE TABLE IF NOT EXISTS app.travel_time_cache (
  origin_cell text NOT NULL,
  place_id uuid NOT NULL,
  duration_min integer NOT NULL CHECK (duration_min >= 0),
  distance_km numeric(8, 1) NOT NULL CHECK (distance_km >= 0),
  provider text NOT NULL CHECK (provider IN ('ors', 'fake')),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (origin_cell, place_id)
);

CREATE INDEX IF NOT EXISTS travel_time_cache_fetched_at_idx ON app.travel_time_cache (fetched_at);

ALTER TABLE app.travel_time_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.travel_time_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.travel_time_cache TO app_rw;
DROP POLICY IF EXISTS travel_time_cache_app_rw ON app.travel_time_cache;
CREATE POLICY travel_time_cache_app_rw ON app.travel_time_cache FOR ALL TO app_rw USING (true) WITH CHECK (true);
