// packages/worker/.dev.vars: local values for `npm run dev` (gitignored).
// `ensureDevVars` creates it with random local secrets; the Testbetrieb
// block (real providers with the user's keys) is managed between two marker
// lines, so it can be replaced or removed without touching the rest.
// Values are never printed.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';

export const devVarsPath = resolve(repoRoot, 'packages/worker/.dev.vars');

const BLOCK_START = '# >>> Testbetrieb';
const BLOCK_HEADER = `${BLOCK_START} (npm run cli -- testbetrieb einrichten; zurück zur Simulation: npm run cli -- testbetrieb aus)`;
const BLOCK_END = '# <<< Testbetrieb';

/** Creates the file with random local secrets if it is missing; true when created. */
export function ensureDevVars(path = devVarsPath): boolean {
  if (existsSync(path)) return false;
  const secret = () => randomBytes(32).toString('base64url');
  writeFileSync(
    path,
    [
      '# Generated with random local values. Not used outside this machine.',
      `SIGNING_KEY=${secret()}`,
      `IP_HASH_SALT=${secret()}`,
      `ALTCHA_HMAC_KEY=${secret()}`,
      `OPS_HB_TOKEN=${secret()}`,
      '',
    ].join('\n'),
  );
  return true;
}

/**
 * Replaces the Testbetrieb block (`null` removes it). Lines outside the block
 * that set one of the block's keys are dropped, so every key appears once.
 */
export function withTestbetriebBlock(content: string, vars: Readonly<Record<string, string>> | null): string {
  const out: string[] = [];
  let inBlock = false;
  for (const line of content.split('\n')) {
    if (line.startsWith(BLOCK_START)) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (line.startsWith(BLOCK_END)) inBlock = false;
      continue;
    }
    const key = /^\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1];
    if (vars && key !== undefined && Object.hasOwn(vars, key)) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  if (vars) out.push('', BLOCK_HEADER, ...Object.entries(vars).map(([k, v]) => `${k}=${v}`), BLOCK_END);
  return `${out.join('\n')}\n`;
}

/** Sets one variable inside the Testbetrieb block; null when there is no block or it lacks the key. */
export function setBlockVar(content: string, key: string, value: string): string | null {
  let inBlock = false;
  let changed = false;
  const lines = content.split('\n').map((line) => {
    if (line.startsWith(BLOCK_START)) inBlock = true;
    else if (line.startsWith(BLOCK_END)) inBlock = false;
    else if (inBlock && new RegExp(`^${key}=`).test(line)) {
      changed = true;
      return `${key}=${value}`;
    }
    return line;
  });
  return changed ? lines.join('\n') : null;
}

export function hasTestbetriebBlock(content: string): boolean {
  return content.split('\n').some((line) => line.startsWith(BLOCK_START));
}

export function updateDevVars(vars: Readonly<Record<string, string>> | null, path = devVarsPath): void {
  ensureDevVars(path);
  writeFileSync(path, withTestbetriebBlock(readFileSync(path, 'utf8'), vars));
}
