// Watchdog in workerd (S9.4): scheduled runs via createScheduledController
// against a scripted health endpoint and Resend; heartbeats via the fetch
// handler; states in Miniflare's KV.
import { env } from 'cloudflare:workers';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import { createOpsWorker } from '../src/index';
import { RESEND_EMAILS_URL } from '../src/mail';

const T0 = Date.parse('2026-09-28T08:00:00Z');
const MIN = 60_000;
const JOBS = Object.keys(productConfig.ops.heartbeat_max_age_min);

beforeEach(async () => {
  const kv = env.OPS_KV as unknown as KVNamespace;
  for (const key of (await kv.list()).keys) await kv.delete(key.name);
});

function harness() {
  let healthStatus = 200;
  let mailFails = false;
  let clock = T0;
  const mails: Array<{ from: string; to: string[]; subject: string; text: string }> = [];
  const worker = createOpsWorker({
    now: () => new Date(clock),
    fetch: async (input, init) => {
      if (input === env.APP_HEALTH_URL) {
        const ok = healthStatus === 200;
        return new Response(JSON.stringify({ status: ok ? 'ok' : 'degraded', db: ok ? 'ok' : 'down', version: 't', product: 'reiseplaner' }), { status: healthStatus });
      }
      if (input === RESEND_EMAILS_URL) {
        if (mailFails) return new Response('{"message":"injected"}', { status: 500 });
        mails.push(JSON.parse(String(init?.body)) as (typeof mails)[number]);
        return new Response(JSON.stringify({ id: `mail-${mails.length}` }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${input}`);
    },
  });
  const h = {
    mails,
    setHealth: (status: number) => void (healthStatus = status),
    setMailFails: (fails: boolean) => void (mailFails = fails),
    async run(atMin: number) {
      clock = T0 + atMin * MIN;
      const controller = createScheduledController({ scheduledTime: new Date(clock), cron: '*/15 * * * *' });
      const ctx = createExecutionContext();
      await worker.scheduled(controller, env);
      await waitOnExecutionContext(ctx);
    },
    async beat(job: string, atMin: number, init: { token?: string; body?: string } = {}) {
      clock = T0 + atMin * MIN;
      return worker.fetch(
        new Request(`https://ops.example/heartbeat/${job}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${init.token ?? env.OPS_HB_TOKEN}`, 'content-type': 'application/json' },
          body: init.body ?? JSON.stringify({ sent: 1, pending: 0 }),
        }),
        env,
      );
    },
    async beatAll(atMin: number) {
      for (const job of JOBS) expect((await h.beat(job, atMin)).status).toBe(204);
    },
  };
  return h;
}

describe('health alarm', () => {
  it('alerts critical at once, stays quiet for 4 hours, reminds, and reports recovery immediately', async () => {
    const h = harness();
    h.setHealth(503);
    await h.beatAll(0);
    await h.run(0);
    expect(h.mails).toHaveLength(1);
    expect(h.mails[0]?.subject).toBe(`[KRITISCH] ${productConfig.name}: Health-Check der App`);
    expect(h.mails[0]?.to).toEqual([productConfig.ops.alert_email]);
    expect(h.mails[0]?.text).toContain('KRITISCH: Health-Check der App – HTTP 503, seit 28.09.2026, 10:00 Uhr');

    for (const m of [15, 120, 225]) {
      await h.beatAll(m);
      await h.run(m);
    }
    expect(h.mails).toHaveLength(1);

    await h.beatAll(240);
    await h.run(240);
    expect(h.mails).toHaveLength(2);
    expect(h.mails[1]?.text).toContain('KRITISCH (weiterhin): Health-Check der App – HTTP 503, seit 28.09.2026, 10:00 Uhr');

    h.setHealth(200);
    await h.beatAll(255);
    await h.run(255);
    expect(h.mails).toHaveLength(3);
    expect(h.mails[2]?.subject).toBe(`[WIEDER IN ORDNUNG] ${productConfig.name}: Health-Check der App`);
    expect(h.mails[2]?.text).toContain('WIEDER IN ORDNUNG: Health-Check der App – HTTP 200, Störung dauerte 4 Std. 15 Min.');

    await h.beatAll(270);
    await h.run(270);
    expect(h.mails).toHaveLength(3);
  });

  it('retries a transition whose e-mail could not be delivered', async () => {
    const h = harness();
    h.setHealth(500);
    h.setMailFails(true);
    await h.beatAll(0);
    await h.run(0);
    expect(h.mails).toHaveLength(0);
    h.setMailFails(false);
    await h.run(15);
    expect(h.mails).toHaveLength(1);
    expect(h.mails[0]?.text).toContain('seit 28.09.2026, 10:15 Uhr');
  });
});

describe('heartbeats', () => {
  it('warns when a job is overdue and reports when it is back', async () => {
    const h = harness();
    await h.beatAll(0);
    await h.run(0);
    await h.run(30);
    expect(h.mails).toHaveLength(0);
    await h.run(45);
    expect(h.mails).toHaveLength(1);
    expect(h.mails[0]?.subject).toBe(`[WARNUNG] ${productConfig.name}: Heartbeat „outbox-retry“`);
    expect(h.mails[0]?.text).toContain('WARNUNG: Heartbeat „outbox-retry“ – letzter Heartbeat ist 45 Min. alt (erlaubt: 30 Min.), seit 28.09.2026, 10:45 Uhr');
    expect((await h.beat('outbox-retry', 50)).status).toBe(204);
    await h.run(60);
    expect(h.mails).toHaveLength(2);
    expect(h.mails[1]?.subject).toBe(`[WIEDER IN ORDNUNG] ${productConfig.name}: Heartbeat „outbox-retry“`);
  });

  it('counts a job that never reported from the start of the watchdog', async () => {
    const h = harness();
    await h.run(0);
    await h.run(30);
    expect(h.mails).toHaveLength(0);
    await h.run(45);
    expect(h.mails[0]?.text).toContain('seit Start des Watchdogs vor 45 Min. kein Heartbeat');
  });

  it('checks token, job and body, and reports the state on /status', async () => {
    const h = harness();
    expect((await h.beat('outbox-retry', 0, { token: 'wrong' })).status).toBe(401);
    expect((await h.beat('unknown-job', 0)).status).toBe(404);
    expect((await h.beat('daily', 0, { body: '{"nested":{"a":1}}' })).status).toBe(400);
    expect((await h.beat('daily', 0, { body: 'kein json' })).status).toBe(400);
    expect((await h.beat('daily', 0, { body: '' })).status).toBe(204);
    const worker = createOpsWorker({ now: () => new Date(T0 + 5 * MIN) });
    const unauthorized = await worker.fetch(new Request('https://ops.example/status'), env);
    expect(unauthorized.status).toBe(401);
    const res = await worker.fetch(new Request('https://ops.example/status', { headers: { authorization: `Bearer ${env.OPS_HB_TOKEN}` } }), env);
    const body = (await res.json()) as { heartbeats: Record<string, { age_min: number | null }> };
    expect(body.heartbeats.daily?.age_min).toBe(5);
    expect(body.heartbeats['outbox-retry']?.age_min).toBeNull();
    expect((await worker.fetch(new Request('https://ops.example/'), env)).status).toBe(404);
    const { OPS_HB_TOKEN: _token, ...withoutToken } = env;
    const misconfigured = await worker.fetch(new Request('https://ops.example/status'), withoutToken);
    expect(misconfigured.status).toBe(503);
  });
});
