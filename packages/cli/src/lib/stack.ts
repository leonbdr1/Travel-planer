// Starts the real local stack for demos: a throwaway PGlite database on a
// free port plus `scripts/dev.ts` (Vite + workerd) pointed at it. With
// `preview: true` Vite serves the production build (`npm run build` first)
// the way Workers Static Assets do, including `_headers`.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot, startLocalDb, type LocalDb, type LocalDbOptions } from '@reiseplaner/db/node';

export async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => done(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

export interface DemoStack {
  baseUrl: string;
  db: LocalDb;
  stopDb(): Promise<void>;
  stop(): Promise<void>;
  /** Combined stdout and stderr of Vite and workerd (Worker logs). */
  log(): string;
}

export interface DemoStackOptions extends Pick<LocalDbOptions, 'onReady'> {
  preview?: boolean;
}

export async function startDemoStack({ preview = false, ...options }: DemoStackOptions = {}): Promise<DemoStack> {
  const workDir = mkdtempSync(join(tmpdir(), 'reiseplaner-demo-'));
  const dbPort = await freePort();
  const webPort = await freePort();
  const db = await startLocalDb({ port: dbPort, dataDir: join(workDir, 'pglite'), log: () => {}, ...options });
  let dbStopped = false;
  const child = spawn('npx', ['tsx', 'scripts/dev.ts', ...(preview ? ['preview', '--port', String(webPort), '--strictPort'] : [])], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(webPort), DB_PORT: String(dbPort), REISEPLANER_STATE_DIR: join(workDir, 'state') },
  });
  let output = '';
  child.stdout?.on('data', (d: Buffer) => (output += d.toString()));
  child.stderr?.on('data', (d: Buffer) => (output += d.toString()));
  const baseUrl = `http://localhost:${webPort}`;
  const stopWeb = async () => {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // gone
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  const stopDb = async () => {
    if (!dbStopped) {
      dbStopped = true;
      await db.stop();
    }
  };
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/api/v1/health`)).status === 200) {
        return {
          baseUrl,
          db,
          stopDb,
          log: () => output,
          async stop() {
            await stopWeb();
            await stopDb();
            rmSync(workDir, { recursive: true, force: true });
          },
        };
      }
    } catch {
      // not ready
    }
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  await stopWeb();
  await stopDb();
  throw new Error(`demo stack did not start:\n${output.slice(-3000)}`);
}
