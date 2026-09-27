// `catalog validate`: vocabulary, texts (length, typography, claims),
// matching status, coordinates inside the country and duplicates.
import { productConfig } from '@reiseplaner/config';
import type { Queryable } from '@reiseplaner/db';
import { findClaimViolations, haversineKm, normalizeGermanTypography, slugify, stripDiacritics } from '@reiseplaner/domain';
import type { LoadedCatalog } from './load';
import type { CatalogCountry } from './schema';

const BOUNDS: Record<CatalogCountry, { lat: [number, number]; lng: [number, number] }> = {
  DE: { lat: [47.2, 55.1], lng: [5.8, 15.1] },
  AT: { lat: [46.3, 49.1], lng: [9.5, 17.2] },
  CH: { lat: [45.8, 47.9], lng: [5.9, 10.6] },
  'IT-BZ': { lat: [46.2, 47.1], lng: [10.3, 12.5] },
};
const DUPLICATE_KM = 3;

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
    const country = (loc.country_code === 'IT' && loc.admin2 === 'BZ' ? 'IT-BZ' : loc.country_code) as CatalogCountry;
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
