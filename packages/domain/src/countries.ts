// Countries of the product (Aufgabe F15, Europe extension): where localities
// come from and where catalog regions lie. South Tyrol keeps its own catalog
// key IT-BZ (German place names, own regions); the rest of Italy is IT.

/** GeoNames country codes of app.geo_localities (start locations, own places, catalog matching). */
export const GEO_COUNTRIES = [
  'DE', 'AT', 'CH', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE',
] as const;
export type GeoCountry = (typeof GEO_COUNTRIES)[number];

/** Catalog country keys (regions/<key>.yaml, app.regions.country_code). */
export const CATALOG_COUNTRIES = [
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE',
] as const;
export type CatalogCountry = (typeof CATALOG_COUNTRIES)[number];

/** German country names for labels ("Venedig, Italien"). */
export const COUNTRY_NAMES_DE: Record<CatalogCountry, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  'IT-BZ': 'Südtirol',
  IT: 'Italien',
  FR: 'Frankreich',
  ES: 'Spanien',
  PT: 'Portugal',
  NL: 'Niederlande',
  BE: 'Belgien',
  LU: 'Luxemburg',
  DK: 'Dänemark',
  CZ: 'Tschechien',
  PL: 'Polen',
  HU: 'Ungarn',
  HR: 'Kroatien',
  SI: 'Slowenien',
  SK: 'Slowakei',
  GR: 'Griechenland',
  GB: 'Großbritannien',
  IE: 'Irland',
  NO: 'Norwegen',
  SE: 'Schweden',
};

export function isGeoCountry(code: string): code is GeoCountry {
  return (GEO_COUNTRIES as readonly string[]).includes(code);
}

export function isCatalogCountry(code: string): code is CatalogCountry {
  return (CATALOG_COUNTRIES as readonly string[]).includes(code);
}

/** Catalog country key of a locality: IT-BZ for South Tyrol (admin2 BZ), else the country code if it is part of the product. */
export function catalogCountry(countryCode: string, admin2 = ''): CatalogCountry | null {
  if (countryCode === 'IT') return admin2 === 'BZ' ? 'IT-BZ' : 'IT';
  return isGeoCountry(countryCode) ? countryCode : null;
}

/** German country name of a locality, null for Germany (the home market needs no country in labels). */
export function countryNameDe(countryCode: string, admin2 = ''): string | null {
  const key = catalogCountry(countryCode, admin2);
  return key ? COUNTRY_NAMES_DE[key] : null;
}
