// `catalog validate`: vocabulary, texts (length, typography, claims),
// matching status, coordinates inside the country and duplicates.
import { productConfig } from '@reiseplaner/config';
import type { Queryable } from '@reiseplaner/db';
import { catalogCountry, constants, findClaimViolations, haversineKm, normalizeGermanTypography, slugify, stripDiacritics } from '@reiseplaner/domain';
import type { LoadedCatalog } from './load';
import type { CatalogCountry } from './schema';

// Rough boxes around each country, islands included (Canaries, Madeira, Crete);
// a plausibility check only, the country itself comes from GeoNames.
export const BOUNDS: Record<CatalogCountry, { lat: [number, number]; lng: [number, number] }> = {
  DE: { lat: [47.2, 55.1], lng: [5.8, 15.1] },
  AT: { lat: [46.3, 49.1], lng: [9.5, 17.2] },
  CH: { lat: [45.8, 47.9], lng: [5.9, 10.6] },
  'IT-BZ': { lat: [46.2, 47.1], lng: [10.3, 12.5] },
  IT: { lat: [35.4, 47.1], lng: [6.6, 18.6] },
  FR: { lat: [41.3, 51.2], lng: [-5.2, 9.6] },
  ES: { lat: [27.6, 43.8], lng: [-18.2, 4.4] },
  PT: { lat: [32.6, 42.2], lng: [-17.3, -6.1] },
  NL: { lat: [50.7, 53.6], lng: [3.3, 7.3] },
  BE: { lat: [49.5, 51.6], lng: [2.5, 6.5] },
  LU: { lat: [49.4, 50.2], lng: [5.7, 6.6] },
  DK: { lat: [54.5, 57.8], lng: [8.0, 15.2] },
  CZ: { lat: [48.5, 51.1], lng: [12.0, 18.9] },
  PL: { lat: [49.0, 54.9], lng: [14.1, 24.2] },
  HU: { lat: [45.7, 48.6], lng: [16.1, 22.9] },
  HR: { lat: [42.3, 46.6], lng: [13.4, 19.5] },
  SI: { lat: [45.4, 46.9], lng: [13.3, 16.7] },
  SK: { lat: [47.7, 49.7], lng: [16.8, 22.6] },
  GR: { lat: [34.8, 41.8], lng: [19.3, 29.7] },
  GB: { lat: [49.8, 60.9], lng: [-8.7, 1.8] },
  IE: { lat: [51.4, 55.5], lng: [-10.7, -5.9] },
  NO: { lat: [57.9, 71.3], lng: [4.5, 31.2] },
  SE: { lat: [55.3, 69.1], lng: [10.9, 24.2] },
  AL: { lat: [39.6, 42.7], lng: [19.2, 21.1] },
  AD: { lat: [42.4, 42.7], lng: [1.4, 1.8] },
  BA: { lat: [42.5, 45.3], lng: [15.7, 19.7] },
  BG: { lat: [41.2, 44.3], lng: [22.3, 28.7] },
  CY: { lat: [34.5, 35.8], lng: [32.2, 34.7] },
  EE: { lat: [57.5, 59.8], lng: [21.7, 28.3] },
  FI: { lat: [59.7, 70.2], lng: [19.0, 31.7] },
  IS: { lat: [63.2, 66.6], lng: [-24.6, -13.4] },
  LV: { lat: [55.6, 58.1], lng: [20.9, 28.3] },
  LI: { lat: [47.0, 47.3], lng: [9.4, 9.7] },
  LT: { lat: [53.8, 56.5], lng: [20.9, 26.9] },
  MT: { lat: [35.7, 36.2], lng: [14.1, 14.7] },
  MC: { lat: [43.7, 43.8], lng: [7.4, 7.5] },
  ME: { lat: [41.8, 43.6], lng: [18.4, 20.4] },
  MK: { lat: [40.8, 42.4], lng: [20.4, 23.1] },
  RO: { lat: [43.6, 48.3], lng: [20.2, 29.8] },
  RS: { lat: [42.2, 46.2], lng: [18.8, 23.1] },
};
const DUPLICATE_KM = constants.CATALOG_DUPLICATE_KM;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  stats: { regions: number; places: number; matched: number; verified: number };
}

export async function validateCatalog(db: Queryable, catalog: LoadedCatalog): Promise<ValidationResult> {
  const errors = [...catalog.errors];
  const warnings: string[] = [];
  const themeCodes = new Set(catalog.themes.map((t) => t.code));
  const regionBySlug = new Map<string, (typeof catalog.regions)[number]>();
  const forbidden = productConfig.compliance.forbidden_claims;

  const checkText = (where: string, text: string) => {
    if (normalizeGermanTypography(text) !== text) errors.push(`${where}: Typografie nicht normalisiert`);
    for (const v of findClaimViolations(text, forbidden)) errors.push(`${where}: verbotene Aussage „${v.claim}“`);
  };

  for (const region of catalog.regions) {
    if (regionBySlug.has(region.slug)) errors.push(`region ${region.slug}: doppelter Slug`);
    regionBySlug.set(region.slug, region);
    for (const t of region.themes) if (!themeCodes.has(t)) errors.push(`region ${region.slug}: unbekanntes Thema ${t}`);
    checkText(`region ${region.slug}`, region.description_de);
  }

  const ids = catalog.places.map((p) => p.place.geonameid).filter((id): id is number => id !== undefined);
  const rows = ids.length
    ? await db.query<{ geonameid: number; country_code: string; admin2: string; lat: number; lng: number }>(
        'SELECT geonameid, country_code::text AS country_code, admin2, lat, lng FROM app.geo_localities WHERE geonameid = ANY($1::int[])',
        [ids],
      )
    : [];
  const localities = new Map(rows.map((r) => [Number(r.geonameid), r]));
  const slugs = new Map<string, string>();
  const seenIds = new Map<number, string>();
  const located: Array<{ label: string; name: string; lat: number; lng: number }> = [];
  let matched = 0;

  for (const { region, place } of catalog.places) {
    const label = `${region}/${place.name}`;
    const reg = regionBySlug.get(region);
    if (!reg) errors.push(`${label}: unbekannte Region`);
    const slug = slugify(place.name);
    if (slugs.has(slug)) errors.push(`${label}: Slug ${slug} doppelt (auch ${slugs.get(slug)})`);
    slugs.set(slug, label);
    for (const [code] of Object.entries(place.themes)) if (!themeCodes.has(code)) errors.push(`${label}: unbekanntes Thema ${code}`);
    if (Object.keys(place.themes).length === 0) errors.push(`${label}: keine Themen`);
    checkText(label, place.description_de);
    if (place.geonameid === undefined) {
      errors.push(`${label}: nicht zugeordnet (npm run cli -- catalog match)`);
      continue;
    }
    if (seenIds.has(place.geonameid)) errors.push(`${label}: dieselbe geonameid wie ${seenIds.get(place.geonameid)}`);
    seenIds.set(place.geonameid, label);
    const loc = localities.get(place.geonameid);
    if (!loc) {
      errors.push(`${label}: geonameid ${place.geonameid} fehlt in der Ortsdatenbank`);
      continue;
    }
    matched += 1;
    const country = catalogCountry(loc.country_code, loc.admin2) ?? (loc.country_code as CatalogCountry);
    if (reg && country !== reg.country) errors.push(`${label}: Ort liegt in ${country}, Region in ${reg.country}`);
    const bounds = BOUNDS[country];
    if (!bounds || loc.lat < bounds.lat[0] || loc.lat > bounds.lat[1] || loc.lng < bounds.lng[0] || loc.lng > bounds.lng[1]) {
      errors.push(`${label}: Koordinaten außerhalb von ${country}`);
    }
    located.push({ label, name: stripDiacritics(place.name), lat: loc.lat, lng: loc.lng });
  }

  for (let i = 0; i < located.length; i += 1) {
    for (let j = i + 1; j < located.length; j += 1) {
      const a = located[i]!;
      const b = located[j]!;
      const close = haversineKm(a, b) < DUPLICATE_KM;
      const similar = a.name.includes(b.name) || b.name.includes(a.name);
      if (close && similar) errors.push(`${a.label} und ${b.label}: mögliche Dublette (unter ${DUPLICATE_KM} km, ähnlicher Name)`);
      else if (close) warnings.push(`${a.label} und ${b.label}: liegen unter ${DUPLICATE_KM} km auseinander`);
    }
  }

  return {
    errors,
    warnings,
    stats: {
      regions: catalog.regions.length,
      places: catalog.places.length,
      matched,
      verified: catalog.places.filter((p) => p.place.verified).length,
    },
  };
}
