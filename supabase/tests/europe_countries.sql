-- Europe extension (20261018a): localities all over Italy and in the new
-- countries, catalog regions and places in them; unknown countries stay out.
BEGIN;
SELECT plan(6);

SELECT lives_ok($$
  INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, admin2, lat, lng, population, feature_code, search_names, search_text)
  VALUES (93164603, 'Venice', 'Venice', 'IT', '20', '', 45.437, 12.333, 51298, 'PPLA', ARRAY['venice'], 'venice')
$$, 'a locality in Italy outside South Tyrol');
SELECT lives_ok($$
  INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, admin2, lat, lng, population, feature_code, search_names, search_text)
  VALUES (92267057, 'Lisbon', 'Lisbon', 'PT', '14', '', 38.717, -9.133, 517802, 'PPLC', ARRAY['lisbon'], 'lisbon')
$$, 'a locality in Portugal');
SELECT throws_ok($$
  INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, admin2, lat, lng, population, feature_code, search_names, search_text)
  VALUES (95128581, 'New York', 'New York', 'US', 'NY', '', 40.71, -74.0, 8000000, 'PPL', ARRAY['new york'], 'new york')
$$, '23514', NULL, 'a country outside the market is rejected');
SELECT lives_ok($$
  INSERT INTO app.regions (slug, name, country_code, lat, lng, description_de, source, ai_assisted, verified)
  VALUES ('test-venedig', 'Venedig', 'IT', 45.4, 12.3, 'Test', 'ai', true, false)
$$, 'a catalog region in Italy');
SELECT lives_ok($$
  INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
  VALUES ('test-lissabon', 'Lissabon', 92267057, 'PT', 38.717, -9.133, 'user', false)
$$, 'a user place in Portugal');
SELECT throws_ok($$
  INSERT INTO app.regions (slug, name, country_code, lat, lng, description_de, source, ai_assisted, verified)
  VALUES ('test-usa', 'USA', 'US', 40.7, -74.0, 'Test', 'ai', true, false)
$$, '23514', NULL, 'a catalog region outside the market is rejected');

SELECT * FROM finish();
ROLLBACK;
