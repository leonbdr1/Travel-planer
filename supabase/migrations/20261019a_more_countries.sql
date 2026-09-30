-- More of Europe (Aufgabe F20): localities and catalog entries in the
-- remaining European countries (Balkans, Baltics, Nordics, Malta, Cyprus,
-- microstates), so that any place can be found and searched, not only the
-- catalog destinations. Additive: only the value lists grow.
ALTER TABLE app.geo_localities DROP CONSTRAINT IF EXISTS geo_localities_country_code_check;
ALTER TABLE app.geo_localities ADD CONSTRAINT geo_localities_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS'
));

ALTER TABLE app.regions DROP CONSTRAINT IF EXISTS regions_country_code_check;
ALTER TABLE app.regions ADD CONSTRAINT regions_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS'
));

ALTER TABLE app.places DROP CONSTRAINT IF EXISTS places_country_code_check;
ALTER TABLE app.places ADD CONSTRAINT places_country_code_check CHECK (country_code IN (
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE', 'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS'
));
