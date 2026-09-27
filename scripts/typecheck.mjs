// `npm run typecheck`: strict TypeScript check of every project. Each package
// has its own tsconfig because Worker, SPA and Node code need different libs.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const projects = [
  ...readdirSync(join(root, 'packages')).flatMap((pkg) =>
    ['tsconfig.json', 'tsconfig.node.json']
      .map((f) => join('packages', pkg, f))
      .filter((p) => existsSync(join(root, p))),
  ),
  'e2e/tsconfig.json',
  'scripts/tsconfig.json',
].filter((p) => existsSync(join(root, p)));

const tsc = join(root, 'node_modules/typescript/bin/tsc');
const run = (project) =>
  new Promise((done) => {
    const child = spawn(process.execPath, [tsc, '-p', project, '--noEmit', '--pretty'], { cwd: root });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => done({ project, code, out }));
  });

const results = [];
const queue = [...projects];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) results.push(await run(queue.shift()));
  }),
);
let failed = 0;
for (const r of results.sort((a, b) => a.project.localeCompare(b.project))) {
  if (r.code === 0) {
    console.log(`typecheck ok   ${r.project}`);
  } else {
    failed += 1;
    console.log(`typecheck FAIL ${r.project}\n${r.out}`);
  }
}
process.exit(failed ? 1 : 0);
