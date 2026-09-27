// Cron Triggers (architektur.md 6.12). Schedules mirror wrangler.jsonc
// `triggers.crons`; a test keeps both in sync. Every job is idempotent and
// reports a heartbeat to the ops worker when it ran.
import { createRequestDeps, type DepsOptions } from './deps';
import { parseRuntimeConfig, type Env } from './env';
import { retryDueEmails } from './mail/outbox';
import { sendHeartbeat } from './services/heartbeat';
import { runCacheCleanup, runDaily } from './services/maintenance';

export const CRON_OUTBOX_RETRY = '*/10 * * * *';
export const CRON_CACHE_CLEANUP = '0 * * * *';
export const CRON_DAILY = '30 3 * * *';
export const CRON_SCHEDULES = [CRON_OUTBOX_RETRY, CRON_CACHE_CLEANUP, CRON_DAILY] as const;
export const CRON_JOBS: Record<(typeof CRON_SCHEDULES)[number], string> = {
  [CRON_OUTBOX_RETRY]: 'outbox-retry',
  [CRON_CACHE_CLEANUP]: 'cache-cleanup',
  [CRON_DAILY]: 'daily',
};

declare const __GIT_SHA__: string | undefined;

function flat(result: object): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(result)) {
    if (typeof v === 'number' || typeof v === 'string') out[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) if (typeof v2 === 'number' || typeof v2 === 'string') out[`${k}.${k2}`] = v2;
    else if (Array.isArray(v)) out[k] = v.length;
  }
  return out;
}

export async function runScheduled(cron: string, env: Env, options: DepsOptions & { heartbeatFetch?: typeof fetch } = {}): Promise<Record<string, number | string>> {
  const config = parseRuntimeConfig(env, typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev');
  const deps = createRequestDeps(env, config, options);
  const job = CRON_JOBS[cron as (typeof CRON_SCHEDULES)[number]];
  try {
    if (!job) {
      console.error(JSON.stringify({ level: 'warn', msg: 'unknown cron schedule', cron }));
      return {};
    }
    const jobDeps = { db: deps.db(), mail: deps.providers().mail, now: deps.now };
    const result =
      job === 'outbox-retry' ? await retryDueEmails(jobDeps) : job === 'cache-cleanup' ? await runCacheCleanup(jobDeps) : await runDaily(jobDeps);
    const summary = flat(result);
    console.log(JSON.stringify({ level: 'info', msg: `cron ${job}`, ...summary }));
    await sendHeartbeat({ url: env.OPS_HEARTBEAT_URL, token: env.OPS_HB_TOKEN, ...(options.heartbeatFetch ? { fetch: options.heartbeatFetch } : {}) }, job, summary);
    return summary;
  } finally {
    await deps.dispose();
  }
}
