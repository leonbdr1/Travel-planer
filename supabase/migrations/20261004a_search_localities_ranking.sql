-- 20261004a_search_localities_ranking: population weighs more within a tier,
-- so "Münch" ranks München before small places with the same prefix
-- (found by the S4.2 endpoint tests). Tiers are unchanged; the population
-- term stays below the smallest gap between tiers (ln(4e6)/40 ≈ 0.38 < 0.5).

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
         s.postal_codes, (s.tier + 0.5 * s.sim + ln(1 + s.population) / 40)::real AS score
    FROM scored s
   WHERE s.tier > 0
   ORDER BY score DESC, s.population DESC, s.name
   LIMIT greatest(1, least(coalesce(p_limit, 8), 20));
$$;

REVOKE ALL ON FUNCTION app.search_localities(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.search_localities(text, integer) TO app_rw, app_import;
