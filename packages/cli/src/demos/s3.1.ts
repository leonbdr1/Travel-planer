// S3.1 demo: GeoNames import of the test extract and a lookup through the
// real CLI entry point (throwaway database), plus a lookup in the full
// development extract.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

function cli(out: DemoOutput, dataDir: string, args: string[]): string {
  out.log(`$ npm run cli -- ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
  const res = spawnSync('npx', ['tsx', 'packages/cli/src/index.ts', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, DB_PORT: '1', REISEPLANER_CLI_DATA_DIR: dataDir },
  });
  const text = res.stdout.trim();
  for (const line of text.split('\n')) out.log(line);
  return text;
}

export async function run(out: DemoOutput): Promise<number> {
  const dir = mkdtempSync(join(tmpdir(), 'reiseplaner-s31-'));
  try {
    const imported = cli(out, join(dir, 'a'), ['geonames', 'import', 'packages/cli/test/fixtures/geonames-sample']);
    const lookup = cli(out, join(dir, 'a'), ['geonames', 'lookup', 'Oberstd']);
    out.log('');
    cli(out, join(dir, 'b'), ['geonames', 'import', 'data/geonames/dev-extract']);
    const full = cli(out, join(dir, 'b'), ['geonames', 'lookup', 'Oberstd']);
    cli(out, join(dir, 'b'), ['geonames', 'lookup', 'Meran']);
    const ok =
      /Importiert: DE 3, AT 2, CH 1, IT-BZ 2/.test(imported) &&
      lookup.split('\n')[0]?.startsWith('Oberstdorf, Bayern, DE') === true &&
      full.split('\n')[0]?.startsWith('Oberstdorf, Bayern, DE') === true;
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
