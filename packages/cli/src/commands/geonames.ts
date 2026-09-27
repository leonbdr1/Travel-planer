// `npm run cli -- geonames import <dir>` and `geonames lookup "<query>"`.
import { resolve } from 'node:path';
import { countLocalities, searchLocalities } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { importGeoNames } from '../geonames/import';
import { openCliDb } from '../lib/db';

export async function geonamesCommand(args: string[], log: (line: string) => void): Promise<number> {
  const [sub, value] = args;
  if ((sub !== 'import' && sub !== 'lookup') || !value) {
    log('usage: geonames import <dir> | geonames lookup "<query>"');
    return 2;
  }
  const { db, via } = await openCliDb();
  try {
    if (sub === 'import') {
      const dir = resolve(process.env.INIT_CWD ?? repoRoot, value);
      const started = Date.now();
      const stats = await importGeoNames(db, dir);
      const b = stats.byCountry;
      log(`Importiert: DE ${b.DE}, AT ${b.AT}, CH ${b.CH}, IT-BZ ${b['IT-BZ']} (${Date.now() - started} ms, Datenbank ${via})`);
      log(`Postleitzahlen: ${stats.postalCodesAssigned} zugeordnet, ${stats.postalCodesUnmatched} ohne passenden Ort`);
      log(`Bestand: ${JSON.stringify(await countLocalities(db))}`);
      return 0;
    }
    const results = await searchLocalities(db, value, 5);
    if (results.length === 0) log('keine Treffer');
    for (const l of results) {
      log(`${l.displayName}, ${l.adminName ?? l.admin1}, ${l.countryCode}  (geonameid ${l.geonameid}, ${l.population} Einw.${l.postalCodes.length ? `, PLZ ${l.postalCodes.join(' ')}` : ''})`);
    }
    return 0;
  } finally {
    await db.close();
  }
}
