// Development seed: fills an empty local database with the GeoNames
// development extract (and, from S3.5, the catalog draft). Idempotent; only
// runs against local databases (npm run dev / db:local).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { countLocalities, countLocalitiesWithPostalCodes, type Db } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { catalogCounts, importCatalog } from './catalog/import';
import { loadCatalog } from './catalog/load';
import { importGeoNames } from './geonames/import';

/** Rows of the extract's dump files: a local database with fewer localities predates an extended extract. */
function extractRows(dir: string): number {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsv'))
    .reduce((sum, f) => sum + readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).length, 0);
}

export async function seedDevData(db: Db, log: (line: string) => void): Promise<void> {
  const dir = resolve(repoRoot, 'data/geonames/dev-extract');
  const localities = Object.values(await countLocalities(db)).reduce((a, b) => a + b, 0);
  // Also after the extract gained places or postal codes (Aufgabe 3); the import is an idempotent upsert.
  const outdated = localities < extractRows(dir) || (existsSync(join(dir, 'zip')) && (await countLocalitiesWithPostalCodes(db)) === 0);
  if (localities === 0 || outdated) {
    const stats = await importGeoNames(db, dir);
    const b = stats.byCountry;
    log(`seed: Ortsdatenbank importiert (DE ${b.DE}, AT ${b.AT}, CH ${b.CH}, IT-BZ ${b['IT-BZ']}, Postleitzahlen ${stats.postalCodesAssigned})`);
  }
  if ((await catalogCounts(db)).places === 0) {
    // Local development only: include the AI draft awaiting approval (BG-11).
    const stats = await importCatalog(db, loadCatalog(resolve(repoRoot, 'data/catalog')), { includeDrafts: true });
    log(`seed: Katalog-Entwurf importiert (${stats.regions} Regionen, ${stats.places} Orte)`);
  }
}
