// `npm run dev`: local stack in one command.
// 1. Creates packages/worker/.dev.vars with random local secrets if missing.
// 2. Starts the local database (PGlite on 127.0.0.1:54329) unless one is
//    already running (`npm run db:local` in another terminal).
// 3. Runs Vite with the Cloudflare plugin (SPA + Worker in workerd).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { DEFAULT_LOCAL_DB_PORT, repoRoot, startLocalDb } from '@reiseplaner/db/node';
import { devVarsPath, ensureDevVars, hasTestbetriebBlock } from '../packages/cli/src/lib/dev-vars';
import { seedDevData } from '../packages/cli/src/seed';

if (ensureDevVars()) console.log('dev: created packages/worker/.dev.vars with random local secrets');
if (hasTestbetriebBlock(readFileSync(devVarsPath, 'utf8'))) {
  console.log('dev: Testbetrieb – real providers with the keys from packages/worker/.dev.vars (npm run cli -- testbetrieb aus switches back)');
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
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
  console.log(`dev: using the database already listening on 127.0.0.1:${dbPort}`);
} else {
  const dataDir = process.env.REISEPLANER_DATA_DIR;
  const local = await startLocalDb({
    port: dbPort,
    ...(dataDir ? { dataDir } : {}),
    onReady: (db) => seedDevData(db, (line) => console.log(line)),
  });
  stopDb = local.stop;
}

// Point the Worker's Hyperdrive binding at this database (wrangler reads
// CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING> in local dev).
const vite = spawn('npx', ['vite', ...process.argv.slice(2)], {
  cwd: resolve(repoRoot, 'packages/web'),
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
  vite.kill('SIGTERM');
  await stopDb?.();
  process.exit(code);
};
vite.on('exit', (code) => void shutdown(code ?? 0));
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
