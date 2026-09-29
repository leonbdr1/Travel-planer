-- Place attractiveness (20261016a): catalog places store fame and attractions
-- 0–3, user places leave them empty, values outside 0–3 are refused.
BEGIN;
SELECT plan(4);

SELECT has_column('app', 'places', 'fame', 'places has fame');
INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
VALUES (990301, 'Ruhedorf', 'Ruhedorf', 'DE', '02', 47.5, 10.5, 800, 'PPL', 'ruhedorf');
SELECT lives_ok($$
  INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified, fame, attractions)
  VALUES ('ort-990301-ruhedorf', 'Ruhedorf', 990301, 'DE', 47.5, 10.5, 'user', false, 1, 0)
$$, 'fame and attractions are stored');
SELECT is((SELECT fame FROM app.places WHERE slug = 'ort-990301-ruhedorf'), 1::smallint, 'fame is read back');
SELECT throws_ok($$UPDATE app.places SET attractions = 4 WHERE slug = 'ort-990301-ruhedorf'$$, '23514', NULL, 'values above 3 are refused');

SELECT * FROM finish();
ROLLBACK;
