// S3.5 demo: validator with 0 errors and an idempotent catalog import
// (twice, same numbers) through the real CLI entry point on a throwaway
// database that holds the GeoNames development extract.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const dir = mkdtempSync(join(tmpdir(), 'reiseplaner-s35-'));
  const env = { ...process.env, DB_PORT: '1', REISEPLANER_CLI_DATA_DIR: join(dir, 'pglite') };
  const cli = (args: string[]) => {
    out.log(`$ npm run cli -- ${args.join(' ')}`);
    const res = spawnSync('npx', ['tsx', 'packages/cli/src/index.ts', ...args], { cwd: repoRoot, encoding: 'utf8', env });
    const lines = res.stdout.trim().split('\n').filter((l) => !l.startsWith('Hinweis:'));
    for (const line of lines) out.log(line);
    return { code: res.status ?? 1, text: res.stdout };
  };
  try {
    cli(['geonames', 'import', 'data/geonames/dev-extract']);
    const validated = cli(['catalog', 'validate']);
    const first = cli(['catalog', 'import', '--include-drafts']);
    const second = cli(['catalog', 'import', '--include-drafts']);
    const counts = (text: string) => /Bestand: .*/.exec(text)?.[0];
    const approvedOnly = cli(['catalog', 'import']);
    const ok =
      validated.code === 0 &&
      / 0 Fehler/.test(validated.text) &&
      counts(first.text) === counts(second.text) &&
      /0 Orte/.test(approvedOnly.text);
    out.log(ok ? '→ Validator 0 Fehler, zweiter Import mit identischem Bestand, ohne Freigabe kein Produktivimport' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
