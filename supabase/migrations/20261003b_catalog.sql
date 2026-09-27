-- 20261003b_catalog: theme vocabulary, regions, places and place themes
-- (architektur.md 5.2). Catalog rows are written by the import role only;
-- the Worker (app_rw) reads everything and may add user places (kind = user)
-- found in the locality database.

CREATE TABLE IF NOT EXISTS app.themes (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z_]*$'),
  label_de text NOT NULL,
  category text NOT NULL CHECK (category IN ('landschaft', 'aktivitaet', 'kultur', 'erholung')),
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS app.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  country_code text NOT NULL CHECK (country_code IN ('DE', 'AT', 'CH', 'IT-BZ')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  description_de text NOT NULL CHECK (char_length(description_de) <= 200),
  source text NOT NULL CHECK (source IN ('ai', 'manual')),
  ai_assisted boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  region_id uuid REFERENCES app.regions (id) ON DELETE SET NULL,
  geonameid integer NOT NULL REFERENCES app.geo_localities (geonameid),
  country_code text NOT NULL CHECK (country_code IN ('DE', 'AT', 'CH', 'IT-BZ')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  search_radius_km numeric(5, 1) NOT NULL DEFAULT 10 CHECK (search_radius_km > 0 AND search_radius_km <= 50),
  description_de text CHECK (description_de IS NULL OR char_length(description_de) <= 160),
  ai_assisted boolean NOT NULL DEFAULT false,
  kind text NOT NULL CHECK (kind IN ('catalog', 'user')),
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'catalog' OR (region_id IS NULL AND verified = false AND description_de IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS places_user_geonameid ON app.places (geonameid) WHERE kind = 'user';
CREATE INDEX IF NOT EXISTS places_region ON app.places (region_id);

CREATE TABLE IF NOT EXISTS app.place_themes (
  place_id uuid NOT NULL REFERENCES app.places (id) ON DELETE CASCADE,
  theme_code text NOT NULL REFERENCES app.themes (code),
  strength smallint NOT NULL CHECK (strength BETWEEN 1 AND 3),
  PRIMARY KEY (place_id, theme_code)
);

ALTER TABLE app.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.place_themes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON app.themes, app.regions, app.places, app.place_themes FROM PUBLIC, anon, authenticated, app_rw;
GRANT SELECT ON app.themes, app.regions, app.places, app.place_themes TO app_rw;
GRANT INSERT, UPDATE ON app.places TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.themes, app.regions, app.places, app.place_themes TO app_import;
GRANT SELECT ON app.geo_localities TO app_import;

DROP POLICY IF EXISTS themes_read ON app.themes;
CREATE POLICY themes_read ON app.themes FOR SELECT TO app_rw USING (true);
DROP POLICY IF EXISTS regions_read ON app.regions;
CREATE POLICY regions_read ON app.regions FOR SELECT TO app_rw USING (true);
DROP POLICY IF EXISTS places_read ON app.places;
CREATE POLICY places_read ON app.places FOR SELECT TO app_rw USING (true);
DROP POLICY IF EXISTS places_user_insert ON app.places;
CREATE POLICY places_user_insert ON app.places FOR INSERT TO app_rw WITH CHECK (kind = 'user' AND verified = false);
DROP POLICY IF EXISTS places_user_update ON app.places;
CREATE POLICY places_user_update ON app.places FOR UPDATE TO app_rw USING (kind = 'user') WITH CHECK (kind = 'user' AND verified = false);
DROP POLICY IF EXISTS place_themes_read ON app.place_themes;
CREATE POLICY place_themes_read ON app.place_themes FOR SELECT TO app_rw USING (true);

DROP POLICY IF EXISTS themes_import ON app.themes;
CREATE POLICY themes_import ON app.themes FOR ALL TO app_import USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS regions_import ON app.regions;
CREATE POLICY regions_import ON app.regions FOR ALL TO app_import USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS places_import ON app.places;
CREATE POLICY places_import ON app.places FOR ALL TO app_import USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS place_themes_import ON app.place_themes;
CREATE POLICY place_themes_import ON app.place_themes FOR ALL TO app_import USING (true) WITH CHECK (true);
