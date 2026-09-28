// Watchdog reiseplaner-ops (architektur.md 3.1, 15; S9.4): own deploy unit
// on workers.dev, separate from what it watches. Cron */15 runs the checks;
// POST /heartbeat/:job receives the heartbeats of the app's cron jobs and
// search workflow; GET /status shows the last run. Both need the bearer
// token OPS_HB_TOKEN.
import { productConfig } from '@reiseplaner/config';
import { z } from 'zod';
import { heartbeatSchema } from './checks';
import type { FetchFn, OpsEnv } from './env';
import { KEYS, readJson, runSummarySchema, runWatchdog } from './watchdog';

export type { OpsEnv, KvStore, FetchFn } from './env';
export { runWatchdog, KEYS, type RunSummary } from './watchdog';

export interface OpsWorkerOptions {
  fetch?: FetchFn;
  now?: () => Date;
}

/** The parts of ScheduledController the watchdog uses. */
interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

const HEARTBEAT_BODY_LIMIT_BYTES = 4096;
// KV allows one write per second and key; searches may finish more often.
const HEARTBEAT_MIN_WRITE_INTERVAL_MS = 60_000;
const detailSchema = z
  .record(z.string().max(60), z.union([z.number(), z.string().max(200)]))
  .refine((d) => Object.keys(d).length <= 30, 'too many fields');

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

/** Compares digests, so the comparison takes the same time for every token. */
async function bearerMatches(header: string | null, token: string): Promise<boolean> {
  const presented = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const [a, b] = [await sha256(presented), await sha256(token)];
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function status(env: OpsEnv, now: Date) {
  const heartbeats: Record<string, { at: string | null; age_min: number | null; max_age_min: number }> = {};
  for (const [job, maxAgeMin] of Object.entries(productConfig.ops.heartbeat_max_age_min)) {
    const beat = await readJson(env.OPS_KV, KEYS.heartbeat(job), heartbeatSchema);
    heartbeats[job] = { at: beat?.at ?? null, age_min: beat ? Math.floor((now.getTime() - Date.parse(beat.at)) / 60_000) : null, max_age_min: maxAgeMin };
  }
  return { now: now.toISOString(), watching_since: await env.OPS_KV.get(KEYS.started), last_run: await readJson(env.OPS_KV, KEYS.lastRun, runSummarySchema), heartbeats };
}

async function receiveHeartbeat(request: Request, env: OpsEnv, job: string, now: Date): Promise<Response> {
  if (!Object.hasOwn(productConfig.ops.heartbeat_max_age_min, job)) return json({ error: 'unknown_job' }, 404);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > HEARTBEAT_BODY_LIMIT_BYTES) return json({ error: 'payload_too_large' }, 413);
  let detail: Record<string, number | string> = {};
  if (raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: 'invalid_body' }, 400);
    }
    const result = detailSchema.safeParse(parsed);
    if (!result.success) return json({ error: 'invalid_body' }, 400);
    detail = result.data;
  }
  const previous = await readJson(env.OPS_KV, KEYS.heartbeat(job), heartbeatSchema);
  if (!previous || now.getTime() - Date.parse(previous.at) >= HEARTBEAT_MIN_WRITE_INTERVAL_MS) {
    await env.OPS_KV.put(KEYS.heartbeat(job), JSON.stringify({ at: now.toISOString(), detail }));
  }
  return json(null, 204);
}

export function createOpsWorker(options: OpsWorkerOptions = {}) {
  const fetchFn: FetchFn = options.fetch ?? ((input, init) => fetch(input, init));
  const now = options.now ?? (() => new Date());
  return {
    async fetch(request: Request, env: OpsEnv): Promise<Response> {
      const url = new URL(request.url);
      const job = /^\/heartbeat\/([a-z0-9-]{1,40})$/.exec(url.pathname)?.[1];
      const isStatus = url.pathname === '/status' && request.method === 'GET';
      if (!(job && request.method === 'POST') && !isStatus) return json({ error: 'not_found' }, 404);
      if (!env.OPS_HB_TOKEN) return json({ error: 'misconfigured' }, 503);
      if (!(await bearerMatches(request.headers.get('authorization'), env.OPS_HB_TOKEN))) return json({ error: 'unauthorized' }, 401);
      return job ? receiveHeartbeat(request, env, job, now()) : json(await status(env, now()));
    },
    async scheduled(controller: ScheduledEvent, env: OpsEnv): Promise<void> {
      await runWatchdog(env, new Date(controller.scheduledTime), fetchFn);
    },
  };
}

export default createOpsWorker();
