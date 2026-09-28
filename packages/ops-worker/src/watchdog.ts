// One watchdog run (cron */15, architektur.md 15): evaluate the health
// endpoint and the heartbeats, advance the alarm state of every check, send
// one e-mail with all transitions and store the states only once that
// e-mail is out (a failed delivery is retried by the next run). KV writes
// happen only when a state really changes.
import { productConfig } from '@reiseplaner/config';
import { z } from 'zod';
import { checkStateSchema, nextState, stateChanged, type AlarmEvent, type CheckResult, type CheckState } from './alarm';
import { checkHealth, checkHeartbeat, heartbeatSchema } from './checks';
import type { FetchFn, KvStore, OpsEnv } from './env';
import { renderAlertMail, sendAlertMail } from './mail';

export const KEYS = {
  started: 'meta:started',
  lastRun: 'meta:last_run',
  heartbeat: (job: string) => `hb:${job}`,
  state: (check: string) => `state:${check}`,
};

export const runSummarySchema = z.object({
  at: z.iso.datetime(),
  checks: z.record(z.string(), z.object({ status: z.enum(['ok', 'failing']), detail: z.string() })),
  events: z.array(z.object({ check: z.string(), kind: z.enum(['alert', 'reminder', 'recovered']), severity: z.enum(['critical', 'warning']).nullable() })),
  mail: z.enum(['none', 'sent', 'logged', 'failed']),
});
export type RunSummary = z.infer<typeof runSummarySchema>;

export async function readJson<T>(kv: KvStore, key: string, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await kv.get(key);
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // fall through
  }
  console.error(JSON.stringify({ level: 'warn', msg: 'invalid kv value ignored', key }));
  return null;
}

export async function runWatchdog(env: OpsEnv, now: Date, fetchFn: FetchFn): Promise<RunSummary> {
  const kv = env.OPS_KV;
  const startedRaw = await kv.get(KEYS.started);
  const started = startedRaw && !Number.isNaN(Date.parse(startedRaw)) ? new Date(startedRaw) : now;
  if (!startedRaw) await kv.put(KEYS.started, now.toISOString());

  const results: Array<[string, CheckResult]> = [['health', await checkHealth(env.APP_HEALTH_URL, fetchFn, productConfig.ops.health_timeout_s)]];
  for (const [job, maxAgeMin] of Object.entries(productConfig.ops.heartbeat_max_age_min)) {
    const beat = await readJson(kv, KEYS.heartbeat(job), heartbeatSchema);
    results.push([`heartbeat:${job}`, checkHeartbeat(beat, now, maxAgeMin, started)]);
  }

  const cooldownMs = productConfig.ops.alert_cooldown_hours * 3_600_000;
  const next: Array<{ check: string; prev: CheckState | null; state: CheckState; event: AlarmEvent | null }> = [];
  for (const [check, result] of results) {
    const prev = await readJson(kv, KEYS.state(check), checkStateSchema);
    next.push({ check, prev, ...nextState(check, prev, result, now, cooldownMs) });
  }
  const events = next.flatMap((n) => (n.event ? [n.event] : []));
  const mail = events.length ? await sendAlertMail(renderAlertMail(events, now, env.APP_HEALTH_URL), env, fetchFn) : 'none';
  for (const n of next) {
    if (n.event && mail === 'failed') continue;
    if (stateChanged(n.prev, n.state)) await kv.put(KEYS.state(n.check), JSON.stringify(n.state));
  }

  const summary: RunSummary = {
    at: now.toISOString(),
    checks: Object.fromEntries(next.map((n) => [n.check, { status: n.state.status, detail: n.state.detail }])),
    events: events.map(({ check, kind, severity }) => ({ check, kind, severity })),
    mail,
  };
  await kv.put(KEYS.lastRun, JSON.stringify(summary));
  console.log(
    JSON.stringify({ level: 'info', msg: 'watchdog run', failing: next.filter((n) => n.state.status === 'failing').map((n) => n.check), events: events.length, mail }),
  );
  return summary;
}
