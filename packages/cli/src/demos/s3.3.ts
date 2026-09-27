// S3.3 demo: both catalog skills against the simulated model through the
// real eval entry point; all deterministic assertions must pass.
import { spawnSync } from 'node:child_process';
import { repoRoot } from '@reiseplaner/db/node';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  let ok = true;
  for (const id of ['reiseplaner.catalog-regions', 'reiseplaner.catalog-places']) {
    out.log(`$ npm run skills:eval -- ${id} --fake`);
    const res = spawnSync('npx', ['tsx', 'packages/skills/src/bin/eval.ts', id, '--fake'], { cwd: repoRoot, encoding: 'utf8' });
    for (const line of res.stdout.trim().split('\n')) out.log(line.replace(`${repoRoot}/`, ''));
    ok &&= res.status === 0 && / 0 nicht bestanden, 0 Fehler/.test(res.stdout);
  }
  out.log(ok ? '→ alle deterministischen Assertions grün (Vokabular, keine Koordinaten, ≤ 160 Zeichen, keine Claims)' : '→ UNEXPECTED');
  return ok ? 0 : 1;
}
