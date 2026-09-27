// `npm run cli -- catalog <match|validate|import> [--include-drafts] [--dir <path>]`
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { flag } from '../lib/args';
import { openCliDb } from '../lib/db';
import { catalogCounts, importCatalog } from '../catalog/import';
import { loadCatalog } from '../catalog/load';
import { matchCatalog } from '../catalog/match';
import { validateCatalog } from '../catalog/validate';

export async function catalogCommand(args: string[], log: (line: string) => void): Promise<number> {
  const sub = args[0];
  if (sub === 'generate') {
    const { catalogGenerateCommand } = await import('./catalog-generate');
    return catalogGenerateCommand(args.slice(1), log);
  }
  if (sub !== 'match' && sub !== 'validate' && sub !== 'import') {
    log('usage: catalog match | validate | import [--include-drafts] | generate --country <DE|AT|CH|IT-BZ> [--fake]');
    return 2;
  }
  const dir = resolve(repoRoot, flag(args, 'dir') ?? 'data/catalog');
  const { db, via } = await openCliDb();
  try {
    const catalog = loadCatalog(dir);
    if (sub === 'match') {
      const report = await matchCatalog(db, catalog);
      log(`Abgleich gegen die Ortsdatenbank (${via}): ${report.exact} exakt, ${report.fuzzy.length} unscharf, ${report.unmatched.length} nicht zugeordnet, ${report.changedFiles} Datei(en) geändert`);
      for (const f of report.fuzzy) log(`  unscharf: ${f.place} → ${f.matched} (${f.geonameid}) – bitte prüfen`);
      for (const u of report.unmatched) log(`  nicht zugeordnet: ${u}`);
      return report.unmatched.length === 0 ? 0 : 1;
    }
    if (sub === 'validate') {
      const result = await validateCatalog(db, catalog);
      for (const e of result.errors) log(`Fehler: ${e}`);
      for (const w of result.warnings) log(`Hinweis: ${w}`);
      const s = result.stats;
      log(`${s.regions} Regionen, ${s.places} Orte (${s.matched} zugeordnet, ${s.verified} freigegeben): ${result.errors.length} Fehler, ${result.warnings.length} Hinweise`);
      return result.errors.length === 0 ? 0 : 1;
    }
    const includeDrafts = args.includes('--include-drafts');
    if (includeDrafts && via === 'DATABASE_URL') {
      log('--include-drafts ist nur gegen die lokale Datenbank erlaubt (BG-11).');
      return 2;
    }
    const stats = await importCatalog(db, catalog, { includeDrafts });
    const counts = await catalogCounts(db);
    log(
      `Import (${via}${includeDrafts ? ', inklusive Entwürfe' : ''}): ${stats.themes} Themen, ${stats.regions} Regionen, ${stats.places} Orte, ${stats.placeThemes} Ort-Themen; ` +
        `übersprungen: ${stats.skippedUnverified} nicht freigegeben, ${stats.skippedUnmatched} nicht zugeordnet`,
    );
    log(`Bestand: ${counts.regions} Regionen, ${counts.places} Katalogorte (${counts.verifiedPlaces} freigegeben)`);
    return 0;
  } finally {
    await db.close();
  }
}
