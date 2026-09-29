-- Europe extension (Aufgabe F15): localities and catalog entries in the
-- European destination countries. The locality table no longer limits Italy
-- to South Tyrol (admin2 = 'BZ'); the catalog keeps 'IT-BZ' for South Tyrol
-- and uses 'IT' for the rest of Italy. Additive: only the value lists grow.
ALTER TABLE app.geo_localities DROP CONSTRAINT IF EXISTS geo_localities_country_code_check;
ALTER TABLE app.geo_localities DROP CONSTRAINT IF EXISTS geo_localities_check;
ALTER TABLE app.geo_localities ADD CONSTRAINT geo_localities_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE'
));

ALTER TABLE app.regions DROP CONSTRAINT IF EXISTS regions_country_code_check;
ALTER TABLE app.regions ADD CONSTRAINT regions_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE'
));

ALTER TABLE app.places DROP CONSTRAINT IF EXISTS places_country_code_check;
ALTER TABLE app.places ADD CONSTRAINT places_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE'
));
