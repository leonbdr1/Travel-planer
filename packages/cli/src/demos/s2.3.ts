// S2.3 demo: drive times Stuttgart → Oberstdorf / Füssen through the real
// CLI entry point; the second identical call is served from the cache and
// causes 0 new routing requests (provider_usage). Uses a throwaway database.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const dir = mkdtempSync(join(tmpdir(), 'reiseplaner-s23-'));
  try {
    const argv = ['tsx', 'packages/cli/src/index.ts', 'ors', 'matrix', '--from', '48.78,9.18', '--to', '47.41,10.28', '47.57,10.70'];
    let lastNew = -1;
    for (const round of [1, 2]) {
      out.log(`$ npm run cli -- ${argv.slice(2).join(' ')}   # call ${round}`);
      const res = spawnSync('npx', argv, {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, DB_PORT: '1', REISEPLANER_CLI_DATA_DIR: join(dir, 'pglite') },
      });
      for (const line of res.stdout.trim().split('\n')) out.log(line);
      const m = /new ORS requests \(provider_usage\): (\d+)/.exec(res.stdout);
      lastNew = m ? Number(m[1]) : -1;
      if (res.status !== 0) {
        out.log(res.stderr);
        return 1;
      }
    }
    return lastNew === 0 ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
