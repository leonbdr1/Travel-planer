// `npm run cli -- catalog generate --country <DE|AT|CH|IT-BZ|all> [--fake] [--out <dir>]`
// Catalog drafts from the catalog skills (Batch API). --fake uses the
// simulated model; real runs need ANTHROPIC_API_KEY (⛔ BG-07) and write to
// data/catalog unless --out is given. Costs are settled into skill_runs.
import { resolve } from 'node:path';
import { productConfig } from '@reiseplaner/config';
import { countLocalities, skillCostSince } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { constants } from '@reiseplaner/domain';
import { createProviders } from '@reiseplaner/providers';
import { dbSkillHooks, fakeResponders } from '@reiseplaner/skills';
import { generateCatalog, parseCountries } from '../catalog/generate';
import { flag } from '../lib/args';
import { openCliDb } from '../lib/db';
import { cliEnv, cliProvidersConfig } from '../lib/env';

export async function catalogGenerateCommand(args: string[], log: (line: string) => void): Promise<number> {
  const countries = parseCountries(flag(args, 'country'));
  if (!countries) {
    log('usage: catalog generate --country <DE|AT|CH|IT-BZ|all>[,…] [--fake] [--out <dir>]');
    return 2;
  }
  const fake = args.includes('--fake');
  const env = cliEnv();
  if (!fake && !env.ANTHROPIC_API_KEY) {
    log('Ohne --fake braucht catalog generate ANTHROPIC_API_KEY (⛔ BG-07: Anthropic-Workspace). Probelauf: --fake');
    return 2;
  }
  const outDir = resolve(repoRoot, flag(args, 'out') ?? 'data/catalog');
  const { db, via } = await openCliDb();
  try {
    const localities = await countLocalities(db);
    if (Object.values(localities).reduce((a, b) => a + b, 0) === 0) {
      log('Die Ortsdatenbank ist leer: zuerst npm run cli -- geonames import <dir>');
      return 2;
    }
    const providers = createProviders(fake ? { ...cliProvidersConfig('fake'), mode: 'fake' } : cliProvidersConfig('sandbox'), {
      fake: { llmResponders: fakeResponders },
    });
    const hooks = dbSkillHooks(db, productConfig.limits.llm_daily_budget_usd);
    const started = new Date();
    const report = await generateCatalog(
      db,
      { llm: providers.llm, llmEnabled: true, prices: productConfig.ai, ...hooks },
      {
        countries,
        outDir,
        sourceDir: resolve(repoRoot, 'data/catalog'),
        pollIntervalMs: fake ? constants.CATALOG_FAKE_POLL_INTERVAL_MS : constants.LLM_BATCH_POLL_INTERVAL_MS,
        now: () => started,
        onProgress: log,
      },
    );
    const costs = await skillCostSince(db, started.toISOString());
    log(`Katalogentwurf (${fake ? 'Fake-Modell' : 'Claude Batch API'}, Datenbank ${via}) → ${outDir.replace(`${repoRoot}/`, '')}`);
    log(`  Regionen: ${report.regionsCreated.length} neu (${report.regionsCreated.join(', ') || '–'}), ${report.regionsSkipped.length} schon vorhanden, ${report.regionsRejected.length} verworfen`);
    log(`  Orte: ${report.placesWritten} geschrieben (${report.exact} exakt, ${report.fuzzy.length} unscharf zugeordnet), ${report.unmatched.length} nicht zugeordnet, ${report.outsideRegion.length} außerhalb der Region, ${report.duplicates.length} Dubletten, ${report.rejected.length} abgelehnt`);
    for (const f of report.fuzzy) log(`  unscharf: ${f.place} → ${f.matched} – bitte prüfen`);
    for (const u of report.unmatched) log(`  nicht zugeordnet: ${u}`);
    for (const o of report.outsideRegion) log(`  außerhalb der Region: ${o}`);
    for (const d of report.duplicates) log(`  Dublette: ${d}`);
    for (const r of [...report.rejected, ...report.regionsRejected, ...report.failedBatchItems]) log(`  verworfen: ${r}`);
    const total = costs.reduce((s, c) => s + c.costUsd, 0);
    log(`  Kosten laut skill_runs: ${total.toFixed(4)} $ (Schätzung vorab ${report.estimateUsd.toFixed(4)} $, Budget ${productConfig.limits.llm_daily_budget_usd} $/Tag)`);
    for (const c of costs) log(`    ${c.skill}: ${c.runs} Aufrufe, ${c.ok} ok, ${c.costUsd.toFixed(4)} $`);
    log(`  Dateien: ${report.files.join(', ') || '–'}`);
    log('  Alle Einträge verified: false, ai_assisted: true → Freigabe durch die Redaktion (BG-11), dann catalog validate und import.');
    return report.failedBatchItems.length === 0 ? 0 : 1;
  } finally {
    await db.close();
  }
}
