// S1.5 demo: every slice ID of the plan has exactly one STATUS row.
import { spawnSync } from 'node:child_process';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const result = spawnSync('node', ['scripts/check-status-rows.mjs'], { cwd: repoRoot, encoding: 'utf8' });
  for (const line of `${result.stdout}${result.stderr}`.trim().split('\n')) out.log(line);
  return result.status ?? 1;
}
