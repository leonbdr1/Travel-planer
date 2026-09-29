// `npm run serve`: the product on this machine, reachable through one local
// port behind the site gate (packages/worker/src/gate.ts), so a tunnel can put it
// on the internet while the computing stays here (docs/runbooks/von-ueberall.md).
// 1. packages/worker/.dev.vars: random local secrets and, if missing, SITE_PASSWORD.
// 2. Builds the SPA (skip with --no-build).
// 3. Starts the local database (PGlite on 127.0.0.1:54329) unless one is running.
// 4. Runs `wrangler dev --env serve` on 127.0.0.1:8787 (--port to change).
// The password is never printed; it is the line SITE_PASSWORD in .dev.vars.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { DEFAULT_LOCAL_DB_PORT, repoRoot, startLocalDb } from '@reiseplaner/db/node';
import { devVarsPath, ensureDevVars, hasTestbetriebBlock } from '../packages/cli/src/lib/dev-vars';
import { seedDevData } from '../packages/cli/src/seed';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? Number(args[portArg + 1]) : 8787;
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error('--port must be a number between 1024 and 65535');

if (ensureDevVars()) console.log('serve: created packages/worker/.dev.vars with random local secrets');
if (!/^\s*SITE_PASSWORD\s*=\s*\S+/m.test(readFileSync(devVarsPath, 'utf8'))) {
  appendFileSync(devVarsPath, `SITE_PASSWORD=${randomBytes(18).toString('base64url')}\n`);
  console.log('serve: created SITE_PASSWORD in packages/worker/.dev.vars (open the file to read or change it)');
}
console.log(
  hasTestbetriebBlock(readFileSync(devVarsPath, 'utf8'))
    ? 'serve: Testbetrieb – real providers with the keys from .dev.vars. Everyone with the password can trigger paid calls (daily caps apply).'
    : 'serve: providers are simulated.',
);

if (!flag('--no-build')) {
  console.log('serve: building the SPA …');
  const build = spawnSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

function portInUse(p: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = createConnection({ port: p, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => done(false));
  });
}

const dbPort = Number(process.env.DB_PORT ?? DEFAULT_LOCAL_DB_PORT);
let stopDb: (() => Promise<void>) | undefined;
if (await portInUse(dbPort)) {
  console.log(`serve: using the database already listening on 127.0.0.1:${dbPort}`);
} else {
  const dataDir = process.env.REISEPLANER_DATA_DIR;
  const local = await startLocalDb({
    port: dbPort,
    ...(dataDir ? { dataDir } : {}),
    onReady: (db) => seedDevData(db, (line) => console.log(line)),
  });
  stopDb = local.stop;
}

const wrangler = spawn('npx', ['wrangler', 'dev', '--env', 'serve', '--ip', '127.0.0.1', '--port', String(port)], {
  cwd: resolve(repoRoot, 'packages/worker'),
  stdio: 'inherit',
  env: {
    ...process.env,
    CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: `postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`,
  },
});

let stopping = false;
const shutdown = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  wrangler.kill('SIGTERM');
  await stopDb?.();
  process.exit(code);
};
wrangler.on('exit', (code) => void shutdown(code ?? 0));
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
console.log(`serve: http://127.0.0.1:${port} (tunnel target); stop with Ctrl-C`);
