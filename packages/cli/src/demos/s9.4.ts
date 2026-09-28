// S9.4 demo: the watchdog's real handlers against the real app. The local
// stack serves /api/v1/health; the outage is real (the database is stopped,
// health answers 503) and so is the recovery (database started again).
// Scheduled runs get their time from the controller, as with
// createScheduledController in the workerd tests, so four hours pass in a
// few seconds. KV is kept in memory; Resend records instead of sending.
import { productConfig } from '@reiseplaner/config';
import { createOpsWorker, KEYS, type KvStore, type OpsEnv } from '@reiseplaner/ops-worker';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const T0 = Date.parse('2026-09-28T08:00:00Z');
const MIN = 60_000;
const RESEND_URL = 'https://api.resend.com/emails';

class MemoryKv implements KvStore {
  readonly data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.data.set(key, value);
  }
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack();
  try {
    const mails: Array<{ subject: string; text: string; to: string[] }> = [];
    let clock = T0;
    const worker = createOpsWorker({
      now: () => new Date(clock),
      fetch: async (input, init) => {
        if (input === RESEND_URL) {
          mails.push(JSON.parse(String(init?.body)) as (typeof mails)[number]);
          return new Response(JSON.stringify({ id: `demo-${mails.length}` }), { status: 200 });
        }
        return fetch(input, init);
      },
    });
    const env: OpsEnv = {
      OPS_KV: new MemoryKv(),
      APP_HEALTH_URL: `${stack.baseUrl}/api/v1/health`,
      OPS_ENV: 'dev',
      OPS_HB_TOKEN: 'demo-ops-token',
      RESEND_API_KEY: 'demo-resend-key',
    };
    const beatAll = async () => {
      for (const job of Object.keys(productConfig.ops.heartbeat_max_age_min)) {
        const res = await worker.fetch(
          new Request(`https://ops.example/heartbeat/${job}`, { method: 'POST', headers: { authorization: `Bearer ${env.OPS_HB_TOKEN}` }, body: '{"demo":1}' }),
          env,
        );
        if (res.status !== 204) throw new Error(`heartbeat ${job} → ${res.status}`);
      }
    };
    const tick = async (atMin: number, note: string) => {
      clock = T0 + atMin * MIN;
      await beatAll();
      const before = mails.length;
      await worker.scheduled({ scheduledTime: clock, cron: '*/15 * * * *' }, env);
      const health = await fetch(env.APP_HEALTH_URL);
      const sent = mails.slice(before);
      out.log(
        `t+${String(atMin).padStart(3)} min (${note}): Health ${health.status} → ${sent.length ? sent.map((m) => `E-Mail „${m.subject}“`).join(', ') : 'keine E-Mail'}`,
      );
      return sent.length;
    };

    const counts: number[] = [];
    counts.push(await tick(0, 'App läuft'));
    await stack.stopDb();
    counts.push(await tick(15, 'Datenbank gestoppt'));
    counts.push(await tick(30, 'weiterhin gestört, innerhalb von 4 Std.'));
    counts.push(await tick(240, 'weiterhin gestört, noch keine 4 Std. seit der Meldung'));
    counts.push(await tick(255, 'weiterhin gestört, 4 Std. seit der Meldung'));
    await stack.restartDb();
    counts.push(await tick(270, 'Datenbank wieder gestartet'));
    counts.push(await tick(285, 'App läuft'));

    for (const [i, m] of mails.entries()) {
      out.log(`--- E-Mail ${i + 1} an ${m.to.join(', ')}: ${m.subject}`);
      for (const line of m.text.trim().split('\n')) out.log(`    ${line}`);
    }
    const status = await worker.fetch(new Request('https://ops.example/status', { headers: { authorization: `Bearer ${env.OPS_HB_TOKEN}` } }), env);
    const lastRun = (await status.json()) as { last_run: { checks: Record<string, { status: string }> } | null };
    out.log(`GET /status → ${status.status}: ${Object.entries(lastRun.last_run?.checks ?? {}).map(([c, s]) => `${c} ${s.status}`).join(', ')}`);
    out.log(`KV-Schlüssel: ${[...(env.OPS_KV as MemoryKv).data.keys()].filter((k) => k !== KEYS.lastRun).sort().join(', ')}`);

    const ok =
      JSON.stringify(counts) === JSON.stringify([0, 1, 0, 0, 1, 1, 0]) &&
      (mails[0]?.subject.startsWith('[KRITISCH]') ?? false) &&
      (mails[1]?.text.includes('(weiterhin)') ?? false) &&
      (mails[2]?.subject.startsWith('[WIEDER IN ORDNUNG]') ?? false);
    out.log(ok ? '→ Alarm „kritisch“ sofort, kein zweiter Alarm innerhalb von 4 Stunden, Erinnerung danach, Entwarnung sofort' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
