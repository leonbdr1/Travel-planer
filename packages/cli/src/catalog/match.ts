// `catalog match`: deterministic matching of every catalog place against the
// locality database (architektur.md S3.4). Writes the geonameid into the
// YAML (comments and layout preserved); coordinates are never taken from the
// catalog text, only from the matched locality.
import { readFileSync, writeFileSync } from 'node:fs';
import { matchLocality, type Queryable } from '@reiseplaner/db';
import { parseDocument } from 'yaml';
import type { LoadedCatalog } from './load';

export interface MatchReport {
  exact: number;
  fuzzy: Array<{ place: string; matched: string; geonameid: number }>;
  unmatched: string[];
  changedFiles: number;
}

export async function matchCatalog(db: Queryable, catalog: LoadedCatalog): Promise<MatchReport> {
  const report: MatchReport = { exact: 0, fuzzy: [], unmatched: [], changedFiles: 0 };
  const regionCountry = new Map(catalog.regions.map((r) => [r.slug, r.country]));
  const byFile = new Map<string, LoadedCatalog['places']>();
  for (const entry of catalog.places) byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry]);
  for (const [file, entries] of byFile) {
    const doc = parseDocument(readFileSync(file, 'utf8'));
    let changed = false;
    for (const { region, index, place } of entries) {
      const country = regionCountry.get(region);
      if (!country) {
        report.unmatched.push(`${place.name} (unknown region ${region})`);
        continue;
      }
      const match = await matchLocality(db, place.match_name ?? place.name, country, country === 'IT-BZ' ? null : (place.admin1 ?? null));
      if (!match) {
        report.unmatched.push(`${place.name} (${region})`);
        if (place.geonameid !== undefined) {
          doc.deleteIn(['places', index, 'geonameid']);
          changed = true;
        }
        continue;
      }
      if (match.exact) report.exact += 1;
      else report.fuzzy.push({ place: `${place.name} (${region})`, matched: match.locality.displayName, geonameid: match.locality.geonameid });
      if (place.geonameid !== match.locality.geonameid) {
        doc.setIn(['places', index, 'geonameid'], match.locality.geonameid);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(file, doc.toString({ lineWidth: 200 }));
      report.changedFiles += 1;
    }
  }
  return report;
}
