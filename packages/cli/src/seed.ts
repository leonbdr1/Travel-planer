// Development seed: fills an empty local database with the GeoNames
// development extract (and, from S3.5, the catalog draft). Idempotent; only
// runs against local databases (npm run dev / db:local).
import { resolve } from 'node:path';
import { countLocalities, type Queryable } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { importGeoNames } from './geonames/import';

export async function seedDevData(db: Queryable, log: (line: string) => void): Promise<void> {
  const localities = await countLocalities(db);
  if (Object.keys(localities).length === 0) {
    const stats = await importGeoNames(db, resolve(repoRoot, 'data/geonames/dev-extract'));
    const b = stats.byCountry;
    log(`seed: Ortsdatenbank importiert (DE ${b.DE}, AT ${b.AT}, CH ${b.CH}, IT-BZ ${b['IT-BZ']})`);
  }
}
