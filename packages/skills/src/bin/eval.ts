// npm run skills:eval -- <skill-id> [--fake] [--update-baseline] [--out <dir>]
// Writes skill-eval-report-<id>.json; exits 1 on a regression against
// baseline.json (real runs only) or when the eval budget was exhausted.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { productConfig } from '@reiseplaner/config';
import { createProviders } from '@reiseplaner/providers';
import { fakeResponders } from '../fake';
import { createLlmJudge } from '../eval/judge';
import { runEval } from '../eval/engine';
import { loadAllBundles } from '../load';
import { getSkill } from '../registry';

const args = process.argv.slice(2);
const skillId = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out');
const fake = args.includes('--fake');
const outIdx = args.indexOf('--out');
const outDir = resolve(outIdx >= 0 ? (args[outIdx + 1] ?? 'eval-results') : resolve(import.meta.dirname, '../../../../eval-results'));

function usd(v: number): string {
  return `${v.toFixed(v === 0 ? 0 : 4)} $`;
}

async function main(): Promise<number> {
  const bundles = loadAllBundles(productConfig.ai);
  const ids = skillId ? [skillId] : bundles.map((b) => b.manifest.id);
  const apiKey = process.env.ANTHROPIC_API_KEY_EVAL ?? process.env.ANTHROPIC_API_KEY;
  if (!fake && !apiKey) {
    console.error('Ohne --fake wird ANTHROPIC_API_KEY_EVAL benötigt (⛔ BG-07). Für einen Probelauf: --fake');
    return 2;
  }
  const providers = createProviders(
    {
      mode: fake ? 'fake' : 'sandbox',
      liteapi: { baseUrl: 'unused', bookBaseUrl: 'unused' },
      ors: { baseUrl: 'unused' },
      resend: {},
      anthropic: { apiKey },
    },
    { fake: { llmResponders: fakeResponders } },
  );
  let exit = 0;
  mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const bundle = bundles.find((b) => b.manifest.id === id);
    if (!bundle) {
      console.error(`Unbekannter Skill: ${id} (vorhanden: ${bundles.map((b) => b.manifest.id).join(', ')})`);
      return 2;
    }
    const report = await runEval({
      bundle,
      compiled: getSkill(id),
      llm: providers.llm,
      prices: productConfig.ai,
      fake,
      ...(fake ? {} : { judge: createLlmJudge(providers.llm, productConfig.ai.eval_judge_model, productConfig.ai) }),
      now: () => new Date(),
    });
    const file = join(outDir, `skill-eval-report-${id}.json`);
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
    const mode = fake ? 'Fake-Modell, Judge-Rubriken übersprungen' : `echtes Modell ${report.model}`;
    console.log(`${report.skill} v${report.version} (${mode})`);
    console.log(
      `  Fälle: ${report.passed} bestanden, ${report.failed} nicht bestanden, ${report.errored} Fehler, ${report.skipped} übersprungen`,
    );
    console.log(`  Score: ${report.score === null ? '–' : report.score.toFixed(3)} (Zielwert ${report.target})`);
    console.log(`  Kosten: ${usd(report.costUsd)} (Deckel ${report.budgetUsd} $ je Skill)${report.aborted ? ' – abgebrochen: Budget erreicht' : ''}`);
    console.log(
      `  Baseline: ${
        report.regression === null
          ? fake
            ? 'nicht verglichen (Fake-Modus)'
            : 'noch keine'
          : `${report.baseline.score} → ${report.regression ? `REGRESSION (> ${report.tolerance})` : 'ok'}`
      }`,
    );
    for (const c of report.cases.filter((x) => x.status === 'fail' || x.status === 'error')) {
      console.log(`  ✗ ${c.id}: ${c.failures.join(' | ')}`);
    }
    console.log(`  Bericht: ${file}`);
    if (report.regression || report.aborted) exit = 1;
    if (!fake && args.includes('--update-baseline') && report.score !== null && !report.regression) {
      writeFileSync(
        join(bundle.dir, 'baseline.json'),
        `${JSON.stringify({ score: report.score, n: report.counted, updatedAt: report.generatedAt })}\n`,
      );
      console.log('  baseline.json aktualisiert');
    }
  }
  return exit;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`skills:eval fehlgeschlagen: ${(err as Error).message}`);
    process.exit(1);
  },
);
