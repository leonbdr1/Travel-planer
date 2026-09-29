// `geonames import <dir>`: reads every country dump (*.txt, *.tsv) in <dir>,
// optional German names from <dir>/alternateNamesV2.txt and postal codes from
// <dir>/zip/*.txt, filters to the market and upserts app.geo_localities
// (idempotent). Runs as the import role in production (app_import).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Queryable } from '@reiseplaner/db';
import { CATALOG_COUNTRIES, catalogCountry, haversineKm, type CatalogCountry, searchNames, searchText, stripDiacritics } from '@reiseplaner/domain';
import { inMarket, parseAlternateNameLine, parseDumpLine, parsePostalLine, type GeoNamesRow } from './parse';

export interface ImportStats {
  byCountry: Partial<Record<CatalogCountry, number>>;
  postalCodesAssigned: number;
  postalCodesUnmatched: number;
}

const BATCH = 400;

/** "DE 11884, AT 3047, …" in the order of CATALOG_COUNTRIES, countries without localities left out. */
export function formatCountryCounts(counts: Partial<Record<string, number>>): string {
  return CATALOG_COUNTRIES.filter((c) => counts[c]).map((c) => `${c} ${counts[c]}`).join(', ');
}

function lines(path: string): string[] {
  return readFileSync(path, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
}

export function readGeoNamesDir(dir: string): { rows: GeoNamesRow[]; germanNames: Map<number, string[]>; postal: Map<number, Set<string>>; unmatchedPostal: number } {
  const dumpFiles = readdirSync(dir).filter((f) => /\.(txt|tsv)$/.test(f) && !f.startsWith('alternateNames'));
  const rows: GeoNamesRow[] = [];
  for (const file of dumpFiles) {
    for (const line of lines(join(dir, file))) {
      const row = parseDumpLine(line);
      if (row && inMarket(row)) rows.push(row);
    }
  }
  const ids = new Set(rows.map((r) => r.geonameid));

  // German names: language-tagged alternate names if available, otherwise the
  // alternatenames column (the development extract carries German names only).
  const germanNames = new Map<number, string[]>();
  const altFile = join(dir, 'alternateNamesV2.txt');
  if (existsSync(altFile)) {
    for (const line of lines(altFile)) {
      const alt = parseAlternateNameLine(line);
      if (!alt || alt.language !== 'de' || alt.historic || !ids.has(alt.geonameid)) continue;
      const list = germanNames.get(alt.geonameid) ?? [];
      if (alt.preferred) list.unshift(alt.name);
      else list.push(alt.name);
      germanNames.set(alt.geonameid, list);
    }
  } else {
    for (const row of rows) if (row.alternateNames.length) germanNames.set(row.geonameid, row.alternateNames);
  }

  // Postal codes: same name within 10 km, else the nearest settlement within 3 km.
  const postal = new Map<number, Set<string>>();
  let unmatchedPostal = 0;
  const zipDir = join(dir, 'zip');
  if (existsSync(zipDir)) {
    const byName = new Map<string, GeoNamesRow[]>();
    for (const row of rows) {
      for (const n of [row.name, ...(germanNames.get(row.geonameid) ?? [])]) {
        const key = `${row.countryCode}|${stripDiacritics(n)}`;
        byName.set(key, [...(byName.get(key) ?? []), row]);
      }
    }
    for (const file of readdirSync(zipDir).filter((f) => f.endsWith('.txt'))) {
      for (const line of lines(join(zipDir, file))) {
        const p = parsePostalLine(line);
        if (!p) continue;
        const candidates = byName.get(`${p.countryCode}|${stripDiacritics(p.placeName)}`) ?? [];
        let best = candidates
          .map((r) => ({ r, d: haversineKm(p, r) }))
          .filter((c) => c.d <= 10)
          .sort((a, b) => a.d - b.d)[0]?.r;
        if (!best) {
          best = rows
            .filter((r) => r.countryCode === p.countryCode)
            .map((r) => ({ r, d: haversineKm(p, r) }))
            .filter((c) => c.d <= 3)
            .sort((a, b) => a.d - b.d)[0]?.r;
        }
        if (!best) {
          unmatchedPostal += 1;
          continue;
        }
        const set = postal.get(best.geonameid) ?? new Set<string>();
        set.add(p.postalCode);
        postal.set(best.geonameid, set);
      }
    }
  }
  return { rows, germanNames, postal, unmatchedPostal };
}

export async function importGeoNames(db: Queryable, dir: string): Promise<ImportStats> {
  const { rows, germanNames, postal, unmatchedPostal } = readGeoNamesDir(dir);
  const stats: ImportStats = { byCountry: {}, postalCodesAssigned: 0, postalCodesUnmatched: unmatchedPostal };
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const params: Array<string | number | readonly string[]> = [];
    const values = batch.map((row) => {
      const alt = germanNames.get(row.geonameid) ?? [];
      const codes = [...(postal.get(row.geonameid) ?? [])].sort();
      stats.postalCodesAssigned += codes.length;
      const country = catalogCountry(row.countryCode, row.admin2);
      if (country) stats.byCountry[country] = (stats.byCountry[country] ?? 0) + 1;
      params.push(
        row.geonameid,
        row.name,
        row.asciiName,
        alt,
        row.countryCode,
        row.admin1,
        row.admin2,
        row.lat,
        row.lng,
        row.population,
        codes,
        row.featureCode,
        searchNames([row.name, row.asciiName, ...alt]),
        searchText([row.name, row.asciiName, ...alt]),
      );
      const b = params.length - 14;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::text[], $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}::text[], $${b + 12}, $${b + 13}::text[], $${b + 14})`;
    });
    await db.query(
      `INSERT INTO app.geo_localities
         (geonameid, name, ascii_name, alt_names_de, country_code, admin1, admin2, lat, lng, population, postal_codes, feature_code, search_names, search_text)
       VALUES ${values.join(', ')}
       ON CONFLICT (geonameid) DO UPDATE SET
         name = EXCLUDED.name, ascii_name = EXCLUDED.ascii_name, alt_names_de = EXCLUDED.alt_names_de,
         country_code = EXCLUDED.country_code, admin1 = EXCLUDED.admin1, admin2 = EXCLUDED.admin2,
         lat = EXCLUDED.lat, lng = EXCLUDED.lng, population = EXCLUDED.population,
         postal_codes = EXCLUDED.postal_codes, feature_code = EXCLUDED.feature_code,
         search_names = EXCLUDED.search_names, search_text = EXCLUDED.search_text, imported_at = now()`,
      params,
    );
  }
  return stats;
}
