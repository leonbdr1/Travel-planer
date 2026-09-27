// Parsers for the GeoNames exports (https://download.geonames.org/export/dump/readme.txt):
// the country dumps (19 tab-separated columns), the postal code exports
// (12 columns) and alternateNamesV2 (language-tagged names).

export interface GeoNamesRow {
  geonameid: number;
  name: string;
  asciiName: string;
  alternateNames: string[];
  lat: number;
  lng: number;
  featureClass: string;
  featureCode: string;
  countryCode: string;
  admin1: string;
  admin2: string;
  population: number;
}

export function parseDumpLine(line: string): GeoNamesRow | null {
  const cols = line.split('\t');
  if (cols.length < 15) return null;
  const geonameid = Number(cols[0]);
  const lat = Number(cols[4]);
  const lng = Number(cols[5]);
  if (!Number.isInteger(geonameid) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    geonameid,
    name: cols[1] ?? '',
    asciiName: cols[2] || cols[1] || '',
    alternateNames: (cols[3] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    lat,
    lng,
    featureClass: cols[6] ?? '',
    featureCode: cols[7] ?? '',
    countryCode: cols[8] ?? '',
    admin1: cols[10] ?? '',
    admin2: cols[11] ?? '',
    population: Number(cols[14]) || 0,
  };
}

export interface PostalRow {
  countryCode: string;
  postalCode: string;
  placeName: string;
  lat: number;
  lng: number;
}

export function parsePostalLine(line: string): PostalRow | null {
  const cols = line.split('\t');
  if (cols.length < 11) return null;
  const lat = Number(cols[9]);
  const lng = Number(cols[10]);
  if (!cols[1] || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { countryCode: cols[0] ?? '', postalCode: cols[1], placeName: cols[2] ?? '', lat, lng };
}

export interface AlternateName {
  geonameid: number;
  language: string;
  name: string;
  preferred: boolean;
  historic: boolean;
}

export function parseAlternateNameLine(line: string): AlternateName | null {
  const cols = line.split('\t');
  if (cols.length < 4) return null;
  const geonameid = Number(cols[1]);
  if (!Number.isInteger(geonameid) || !cols[3]) return null;
  return {
    geonameid,
    language: cols[2] ?? '',
    name: cols[3],
    preferred: cols[4] === '1',
    historic: cols[7] === '1',
  };
}

/** Market filter: settlements (class P) in DE, AT, CH and the province of Bolzano. */
export function inMarket(row: GeoNamesRow): boolean {
  if (row.featureClass !== 'P') return false;
  if (row.countryCode === 'DE' || row.countryCode === 'AT' || row.countryCode === 'CH') return true;
  return row.countryCode === 'IT' && row.admin2 === 'BZ';
}
