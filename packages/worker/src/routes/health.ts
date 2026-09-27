// GET /api/v1/health (architektur.md 15): content-free status for the SPA,
// the ops watchdog and deploy smoke tests. 503 when the database is down.
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import type { HealthResponse } from '@reiseplaner/contracts';
import { pingDb } from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';
import type { AppEnv } from '../app';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export const healthRoutes = new Hono<AppEnv>().get('/health', async (c) => {
  const deps = c.get('deps');
  let dbOk = false;
  try {
    dbOk = await withTimeout(pingDb(deps.db()), constants.HEALTH_DB_TIMEOUT_MS);
  } catch {
    dbOk = false;
  }
  const body: HealthResponse = {
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'down',
    version: deps.config.version,
    product: productConfig.slug,
  };
  return c.json(body, dbOk ? 200 : 503);
});
