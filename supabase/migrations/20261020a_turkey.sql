-- Turkey counts as Europe (Ben, 30.09.2026, Aufgabe F20): localities and catalog
-- entries may use TR. Additive: only the value lists grow.
ALTER TABLE app.geo_localities DROP CONSTRAINT IF EXISTS geo_localities_country_code_check;
ALTER TABLE app.geo_localities ADD CONSTRAINT geo_localities_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS', 'TR'
));

ALTER TABLE app.regions DROP CONSTRAINT IF EXISTS regions_country_code_check;
ALTER TABLE app.regions ADD CONSTRAINT regions_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS', 'TR'
));

ALTER TABLE app.places DROP CONSTRAINT IF EXISTS places_country_code_check;
ALTER TABLE app.places ADD CONSTRAINT places_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS', 'TR'
));
