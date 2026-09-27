// S9.2 demo: a simulated day with 40,000 rate requests and 8 bookings
// (5,000 : 1). The daily cron job (real dispatcher) alerts the ops address
// through the outbox and lowers the maximum of combinations for new
// searches; /meta/config of the in-process app shows the lowered value.
// Finally the cost report of the last 7 days.
import { createTestDb } from '@reiseplaner/db/testing';
import { productConfig } from '@reiseplaner/config';
import { createApp } from '@reiseplaner/worker/app';
import { CRON_DAILY, runScheduled } from '@reiseplaner/worker/cron';
import type { Env } from '@reiseplaner/worker/env';
import { renderEmail } from '@reiseplaner/worker/mail';
import { costReport } from '../commands/cost-report';
import type { DemoOutput } from '../lib/output';
import { wranglerVars } from '../lib/worker-env';

export async function run(out: DemoOutput): Promise<number> {
  const test = await createTestDb();
  const db = { ...test.db, close: async () => undefined };
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
    await test.db.query("INSERT INTO app.hotels (id, name) VALUES ('lp-demo-1', 'Demohaus')");
    await test.db.query("INSERT INTO app.provider_usage (day, provider, endpoint, calls) VALUES ($1::date, 'liteapi', 'hotels/rates', 40000)", [yesterday]);
    for (let i = 0; i < 8; i += 1) {
      await test.db.query(
        `INSERT INTO app.bookings (booking_ref, hotel_id, offer_snapshot, status, checkin, checkout, occupancy, total_price_cents, currency,
                                   holder_first_name, holder_last_name, holder_email, liteapi_booking_id, confirmed_at)
         VALUES ($1, 'lp-demo-1', '{"hotelName":"Demohaus"}', 'confirmed', '2026-11-06', '2026-11-08', '[]', 20000, 'EUR', 'Gast', 'Demo', 'gast@example.org', $2, now() - interval '1 day')`,
        [`D${String(i).padStart(7, '0')}`, `FKB-D${i}`],
      );
    }
    out.log('Simulierter Tag: 40.000 Tarifanfragen, 8 bestätigte Buchungen');
    const env = { ...wranglerVars(), HYPERDRIVE: { connectionString: 'unused' } } as unknown as Env;
    const summary = await runScheduled(CRON_DAILY, env, { dbFactory: () => db });
    out.log(`Cron ${CRON_DAILY} (daily): ${JSON.stringify(summary)}`);

    const alerts = await test.db.query<{ to_email: string; status: string; payload: string }>(
      "SELECT to_email, status, payload::text AS payload FROM app.email_outbox WHERE type = 'ops_alert' ORDER BY id",
    );
    for (const a of alerts) {
      const mail = renderEmail('ops_alert', JSON.parse(a.payload));
      out.log(`Outbox ops_alert an ${a.to_email} (${a.status}): ${mail.subject}`);
      for (const line of mail.text.split('\n').slice(0, 6)) out.log(`  ${line}`);
    }

    const app = createApp({ dbFactory: () => db });
    const res = await app.request('/api/v1/meta/config', {}, env as unknown as Parameters<typeof app.request>[2]);
    const cfg = (await res.json()) as { limits: { max_combinations: number } };
    out.log(`GET /meta/config → max_combinations ${cfg.limits.max_combinations} (konfiguriert ${productConfig.limits.search.max_combinations})`);
    out.log('');
    for (const line of (await costReport(test.db, 7, now)).split('\n')) out.log(line);

    const ok = summary['lookToBook.state'] === 'throttled' && summary['lookToBook.ratio'] === 5000 && alerts.length === 1 && cfg.limits.max_combinations === 40;
    out.log(ok ? '→ Alarm in der Outbox, neue Suchen auf 40 Kombinationen gedrosselt' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await test.close();
  }
}
