// Supply-chain check (run right after `npm ci --ignore-scripts`):
// - every package in package-lock.json comes from an allowed registry and
//   carries an integrity hash,
// - direct dependencies are pinned to exact versions,
// - packages with install scripts are either on the rebuild allowlist or
//   explicitly documented as not needing a rebuild.
// With --rebuild the allowlisted packages are rebuilt (their install scripts
// run, nothing else's).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const policy = JSON.parse(readFileSync(join(root, 'supply-chain-policy.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const problems = [];

for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (!path.includes('node_modules/') || entry.link) continue;
  const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  if (!policy.allowedRegistries.some((r) => entry.resolved?.startsWith(r))) {
    problems.push(`${name}: resolved from a non-allowed source (${entry.resolved ?? 'none'})`);
  }
  if (policy.requireIntegrity && !entry.integrity) problems.push(`${name}: missing integrity hash`);
  if (entry.hasInstallScript && !policy.rebuildAllowlist.includes(name) && !(name in policy.installScriptsWithoutRebuild)) {
    problems.push(`${name}: has an install script but is neither on the rebuild allowlist nor documented`);
  }
}

if (policy.requireExactVersions) {
  const manifests = ['package.json', ...readdirSync(join(root, 'packages')).map((p) => join('packages', p, 'package.json'))];
  for (const manifest of manifests) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(root, manifest), 'utf8'));
    } catch {
      continue;
    }
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
        if (dep.startsWith('@reiseplaner/')) continue;
        if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(range)) problems.push(`${manifest}: ${dep}@${range} is not pinned exactly`);
      }
    }
  }
}

if (problems.length) {
  console.error(`supply-chain: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`supply-chain: ok (${Object.keys(lock.packages ?? {}).length} lock entries checked)`);

if (process.argv.includes('--rebuild')) {
  execFileSync('npm', ['rebuild', ...policy.rebuildAllowlist], { cwd: root, stdio: 'inherit' });
  console.log(`supply-chain: rebuilt ${policy.rebuildAllowlist.join(', ')}`);
}
