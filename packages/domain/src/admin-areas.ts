// German display names of GeoNames admin1 codes for the market countries
// (Bundesländer, Kantone) and South Tyrol (IT, admin2 = BZ).
const DE: Record<string, string> = {
  '01': 'Baden-Württemberg', '02': 'Bayern', '03': 'Bremen', '04': 'Hamburg', '05': 'Hessen',
  '06': 'Niedersachsen', '07': 'Nordrhein-Westfalen', '08': 'Rheinland-Pfalz', '09': 'Saarland',
  '10': 'Schleswig-Holstein', '11': 'Brandenburg', '12': 'Mecklenburg-Vorpommern', '13': 'Sachsen',
  '14': 'Sachsen-Anhalt', '15': 'Thüringen', '16': 'Berlin',
};
const AT: Record<string, string> = {
  '01': 'Burgenland', '02': 'Kärnten', '03': 'Niederösterreich', '04': 'Oberösterreich', '05': 'Salzburg',
  '06': 'Steiermark', '07': 'Tirol', '08': 'Vorarlberg', '09': 'Wien',
};
const CH: Record<string, string> = {
  AG: 'Aargau', AI: 'Appenzell Innerrhoden', AR: 'Appenzell Ausserrhoden', BE: 'Bern', BL: 'Basel-Landschaft',
  BS: 'Basel-Stadt', FR: 'Freiburg', GE: 'Genf', GL: 'Glarus', GR: 'Graubünden', JU: 'Jura', LU: 'Luzern',
  NE: 'Neuenburg', NW: 'Nidwalden', OW: 'Obwalden', SG: 'St. Gallen', SH: 'Schaffhausen', SO: 'Solothurn',
  SZ: 'Schwyz', TG: 'Thurgau', TI: 'Tessin', UR: 'Uri', VD: 'Waadt', VS: 'Wallis', ZG: 'Zug', ZH: 'Zürich',
};

export function adminAreaName(countryCode: string, admin1: string, admin2 = ''): string | null {
  if (countryCode === 'IT') return admin2 === 'BZ' ? 'Südtirol' : null;
  const table = countryCode === 'DE' ? DE : countryCode === 'AT' ? AT : countryCode === 'CH' ? CH : null;
  return table?.[admin1] ?? null;
}

/** Catalog country key: DE, AT, CH or IT-BZ (South Tyrol). */
export function catalogCountry(countryCode: string, admin2 = ''): 'DE' | 'AT' | 'CH' | 'IT-BZ' | null {
  if (countryCode === 'DE' || countryCode === 'AT' || countryCode === 'CH') return countryCode;
  return countryCode === 'IT' && admin2 === 'BZ' ? 'IT-BZ' : null;
}

/**
 * Preferred German display name: the first (preferred) German alternative
 * name if the importer found one (Bozen, München, Wien …), else the GeoNames name.
 */
export function displayName(name: string, altNamesDe: readonly string[], _countryCode?: string): string {
  return altNamesDe[0] ?? name;
}
