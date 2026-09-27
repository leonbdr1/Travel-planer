-- 20261003a_geo_localities: settlements of DE, AT, CH and South Tyrol from
-- GeoNames (CC BY 4.0) for start-location autocomplete and catalog matching
-- (architektur.md 5.2, E8). Written by the import role, read by app_rw.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO app_rw, app_import;
SET LOCAL search_path = app, extensions, public;

CREATE TABLE IF NOT EXISTS app.geo_localities (
  geonameid integer PRIMARY KEY,
  name text NOT NULL,
  ascii_name text NOT NULL,
  alt_names_de text[] NOT NULL DEFAULT '{}',
  country_code char(2) NOT NULL CHECK (country_code IN ('DE', 'AT', 'CH', 'IT')),
  admin1 text NOT NULL DEFAULT '',
  admin2 text NOT NULL DEFAULT '',
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  population integer NOT NULL DEFAULT 0 CHECK (population >= 0),
  postal_codes text[] NOT NULL DEFAULT '{}',
  feature_code text NOT NULL,
  -- lower-case name variants (original, without diacritics, German
  -- transliteration, German alternative names) maintained by the importer;
  -- search_text joins them for trigram matching
  search_names text[] NOT NULL DEFAULT '{}',
  search_text text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (country_code <> 'IT' OR admin2 = 'BZ')
);

CREATE INDEX IF NOT EXISTS geo_localities_search_trgm ON app.geo_localities USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS geo_localities_postal_codes ON app.geo_localities USING gin (postal_codes);
CREATE INDEX IF NOT EXISTS geo_localities_country_admin1 ON app.geo_localities (country_code, admin1);

ALTER TABLE app.geo_localities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.geo_localities FROM PUBLIC, anon, authenticated, app_rw;
GRANT SELECT ON app.geo_localities TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.geo_localities TO app_import;
DROP POLICY IF EXISTS geo_localities_read ON app.geo_localities;
CREATE POLICY geo_localities_read ON app.geo_localities FOR SELECT TO app_rw USING (true);
DROP POLICY IF EXISTS geo_localities_import ON app.geo_localities;
CREATE POLICY geo_localities_import ON app.geo_localities FOR ALL TO app_import USING (true) WITH CHECK (true);

-- Autocomplete (architektur.md 6.2 step 1): postal code prefix, exact name,
-- name prefix, word inside a name, then word similarity; within a tier the
-- larger place wins. `p_query` must already be normalised (lower case, no
-- diacritics).
CREATE OR REPLACE FUNCTION app.search_localities(p_query text, p_limit integer)
RETURNS TABLE (
  geonameid integer,
  name text,
  alt_names_de text[],
  country_code text,
  admin1 text,
  admin2 text,
  lat double precision,
  lng double precision,
  population integer,
  postal_codes text[],
  score real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = app, extensions, public
AS $$
  WITH q AS (SELECT p_query AS v, p_query ~ '^[0-9]{3,5}$' AS is_postal),
  scored AS (
    SELECT g.*,
           CASE
             WHEN q.is_postal AND EXISTS (SELECT 1 FROM unnest(g.postal_codes) pc WHERE pc LIKE q.v || '%') THEN 5
             WHEN q.v = ANY(g.search_names) THEN 4
             WHEN EXISTS (SELECT 1 FROM unnest(g.search_names) n WHERE n LIKE q.v || '%') THEN 3
             WHEN g.search_text LIKE '% ' || q.v || '%' OR g.search_text LIKE '%-' || q.v || '%' THEN 1.5
             WHEN word_similarity(q.v, g.search_text) >= 0.6 THEN 1
             ELSE 0
           END AS tier,
           word_similarity(q.v, g.search_text) AS sim
      FROM app.geo_localities g, q
     WHERE length(q.v) >= 2
  )
  SELECT s.geonameid, s.name, s.alt_names_de, s.country_code::text, s.admin1, s.admin2, s.lat, s.lng, s.population,
         s.postal_codes, (s.tier + 0.5 * s.sim + ln(1 + s.population) / 100)::real AS score
    FROM scored s
   WHERE s.tier > 0
   ORDER BY score DESC, s.population DESC, s.name
   LIMIT greatest(1, least(coalesce(p_limit, 8), 20));
$$;

REVOKE ALL ON FUNCTION app.search_localities(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.search_localities(text, integer) TO app_rw, app_import;
