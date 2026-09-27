// S1.2 demo: `npm run db:test` – fresh PGlite, all migrations, pgTAP suites.
import { spawnSync } from 'node:child_process';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const result = spawnSync('npx', ['tsx', 'packages/db/src/bin/pgtap.ts'], { cwd: repoRoot, encoding: 'utf8' });
  for (const line of `${result.stdout}${result.stderr}`.trim().split('\n')) out.log(line);
  return result.status ?? 1;
}
