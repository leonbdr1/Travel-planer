-- Catalog permissions: app_rw reads the catalog and may only create
-- unverified user places; the import role writes the catalog.
BEGIN;
SELECT plan(8);

INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
VALUES (990001, 'Testdorf', 'Testdorf', 'DE', '02', 47.5, 10.5, 1200, 'PPL', 'testdorf');
INSERT INTO app.themes (code, label_de, category) VALUES ('wandern', 'Wandern', 'aktivitaet') ON CONFLICT DO NOTHING;
INSERT INTO app.regions (slug, name, country_code, lat, lng, description_de, source)
VALUES ('test-region', 'Testregion', 'DE', 47.5, 10.5, 'Testregion', 'ai');

SET LOCAL ROLE app_import;
SELECT lives_ok($$
  INSERT INTO app.places (slug, name, region_id, geonameid, country_code, lat, lng, kind, verified, ai_assisted, description_de)
  SELECT 'testdorf', 'Testdorf', id, 990001, 'DE', 47.5, 10.5, 'catalog', true, true, 'Test' FROM app.regions WHERE slug = 'test-region'
$$, 'app_import writes catalog places');
SELECT lives_ok($$INSERT INTO app.place_themes (place_id, theme_code, strength) SELECT id, 'wandern', 3 FROM app.places WHERE slug = 'testdorf'$$,
  'app_import writes place themes');
RESET ROLE;

SET LOCAL ROLE app_rw;
SELECT is((SELECT count(*)::int FROM app.places WHERE slug = 'testdorf'), 1, 'app_rw reads places');
SELECT throws_ok($$INSERT INTO app.regions (slug, name, country_code, lat, lng, description_de, source) VALUES ('x', 'x', 'DE', 1, 1, 'x', 'ai')$$,
  '42501', NULL, 'app_rw cannot write regions');
SELECT throws_ok($$INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified) VALUES ('fake', 'Fake', 990001, 'DE', 47.5, 10.5, 'catalog', true)$$,
  '42501', NULL, 'app_rw cannot create catalog places');
SELECT lives_ok($$INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified) VALUES ('user-testdorf', 'Testdorf', 990001, 'DE', 47.5, 10.5, 'user', false)$$,
  'app_rw creates an unverified user place');
SELECT throws_ok($$UPDATE app.places SET verified = true WHERE slug = 'user-testdorf'$$, '42501', NULL,
  'app_rw cannot verify a user place');
SELECT is((SELECT count(*)::int FROM app.places WHERE slug = 'testdorf' AND verified), 1, 'catalog place unchanged');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
