// Worker vars from packages/worker/wrangler.jsonc for in-process runs of the
// Hono app (demos that need a variant of the runtime configuration).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';

export function wranglerVars(): Record<string, string> {
  const text = readFileSync(resolve(repoRoot, 'packages/worker/wrangler.jsonc'), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
  const config = JSON.parse(text) as { vars: Record<string, string> };
  return config.vars;
}
