// Starts the real local stack (`scripts/dev.ts`: PGlite + Vite + workerd) on
// free ports with a throwaway data directory, without test overrides.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { createPostgresDb } from '@reiseplaner/db';

export async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => done(port));
    });
  });
}

export interface Stack {
  baseUrl: string;
  /**
   * Clears the per-visitor rate-limit counters of the throwaway stack: each
   * flow is a new visitor, so a full run (many flows, one IP) does not hit
   * the hourly lookup limit. The product limits themselves are unchanged.
   */
  resetRateLimits(): Promise<void>;
  stop(): Promise<void>;
  log(): string;
}

export async function startStack(repoRoot: string, workDir: string): Promise<Stack> {
  const [webPort, dbPort] = [await freePort(), await freePort()];
  mkdirSync(workDir, { recursive: true });
  let output = '';
  const child: ChildProcess = spawn('npx', ['tsx', 'scripts/dev.ts'], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(webPort),
      DB_PORT: String(dbPort),
      REISEPLANER_DATA_DIR: join(workDir, 'pglite'),
      REISEPLANER_STATE_DIR: join(workDir, 'wrangler-state'),
    },
  });
  child.stdout?.on('data', (d: Buffer) => (output += d.toString()));
  child.stderr?.on('data', (d: Buffer) => (output += d.toString()));

  const baseUrl = `http://localhost:${webPort}`;
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const stop = async () => {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // already gone
      }
      await new Promise((r) => setTimeout(r, 1500));
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // already gone
      }
    }
  };
  if (!ready) {
    await stop();
    throw new Error(`stack did not become healthy:\n${output.slice(-4000)}`);
  }
  const resetRateLimits = async () => {
    const db = createPostgresDb(`postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`, { max: 1 });
    try {
      await db.query('DELETE FROM app.rate_limits');
    } finally {
      await db.close();
    }
  };
  return { baseUrl, resetRateLimits, stop, log: () => output };
}
