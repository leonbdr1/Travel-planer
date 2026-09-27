// Verifies that every slice/operator ID in docs/umsetzungsplan.md has exactly
// one row in STATUS.md with a valid maturity level (Verify-Slice check 3).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const plan = readFileSync(resolve(root, 'docs/umsetzungsplan.md'), 'utf8');
const status = readFileSync(resolve(root, 'STATUS.md'), 'utf8');

const ids = [...plan.matchAll(/^\*\*([SO]\d+\.\d+)\s/gm)].map((m) => m[1]);
const levels = new Set([
  "spec'd",
  'built',
  'wired',
  'demonstrated',
  'demonstrated-not-maximized',
  'live-verified',
  'maximized',
  'blocked',
]);

const rows = status
  .split('\n')
  .filter((l) => /^\|\s*[SO]\d+\.\d+\s*\|/.test(l))
  .map((l) => l.split('|').map((c) => c.trim()));

const problems = [];
for (const id of ids) {
  const matching = rows.filter((r) => r[1] === id);
  if (matching.length !== 1) problems.push(`${id}: ${matching.length} STATUS rows (expected exactly 1)`);
  for (const r of matching) {
    const level = (r[3] ?? '').replace(/`/g, '');
    if (!levels.has(level)) problems.push(`${id}: unknown maturity level "${r[3]}"`);
  }
}
for (const r of rows) if (!ids.includes(r[1])) problems.push(`${r[1]}: STATUS row without a slice in the plan`);

if (problems.length) {
  for (const p of problems) console.error(`check-status-rows: ${p}`);
  process.exit(1);
}
console.log(`check-status-rows: alle ${ids.length} Slice-IDs aus umsetzungsplan.md haben genau eine STATUS-Zeile`);
