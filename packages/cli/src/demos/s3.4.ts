// S3.4 demo: `catalog generate --country DE --fake` through the real CLI on a
// throwaway database with the GeoNames development extract, then the
// validator on the generated drafts. The drafts are kept as evidence in
// docs/demos/S3.4/catalog-fake/.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const dir = mkdtempSync(join(tmpdir(), 'reiseplaner-s34-'));
  const target = 'docs/demos/S3.4/catalog-fake';
  rmSync(join(repoRoot, target), { recursive: true, force: true });
  const env = { ...process.env, DB_PORT: '1', REISEPLANER_CLI_DATA_DIR: join(dir, 'pglite') };
  const cli = (args: string[]) => {
    out.log(`$ npm run cli -- ${args.join(' ')}`);
    const res = spawnSync('npx', ['tsx', 'packages/cli/src/index.ts', ...args], { cwd: repoRoot, encoding: 'utf8', env });
    for (const line of res.stdout.trim().split('\n')) out.log(line.replace(`${repoRoot}/`, ''));
    return { code: res.status ?? 1, text: res.stdout };
  };
  try {
    cli(['geonames', 'import', 'data/geonames/dev-extract']);
    const generated = cli(['catalog', 'generate', '--country', 'DE', '--fake', '--out', target]);
    const validated = cli(['catalog', 'validate', '--dir', target]);
    const ok =
      generated.code === 0 &&
      /Regionen: 4 neu/.test(generated.text) &&
      /nicht zugeordnet: Allgäu\/Alpseewinkel/.test(generated.text) &&
      /Dublette: Allgäu\/Markt Oberstdorf/.test(generated.text) &&
      /Kosten laut skill_runs: 0\.0000 \$/.test(generated.text) &&
      validated.code === 0 &&
      / 0 Fehler/.test(validated.text);
    out.log(ok ? `→ YAML-Entwürfe für die Fake-Regionen unter ${target}, Validator 0 Fehler, Kosten 0 $` : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
