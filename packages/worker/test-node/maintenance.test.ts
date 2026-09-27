// Maintenance jobs against PGlite: look-to-book watch (alert, throttle,
// recovery), retention periods, review invitations, budget warnings,
// cache cleanup and the cron dispatcher with heartbeats.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import type { Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type ProvidersConfig } from '@reiseplaner/providers';
import { CRON_DAILY, runScheduled } from '../src/cron';
import type { Env } from '../src/env';
import { effectiveMaxCombinations, runCacheCleanup, runDaily } from '../src/services/maintenance';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const now = new Date('2026-09-27T03:30:00Z');

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
  await test.db.query("INSERT INTO app.hotels (id, name) VALUES ('lp-m-1', 'Wartungshaus')");
});
afterEach(async () => test.close());

const deps = (db: Db) => ({ db, mail: createProviders(config).mail, now: () => now });

async function rateCalls(db: Db, calls: number) {
  await db.query("INSERT INTO app.provider_usage (day, provider, endpoint, calls) VALUES ('2026-09-26', 'liteapi', 'hotels/rates', $1)", [calls]);
}

let refCounter = 0;
async function booking(db: Db, opts: { confirmedDaysAgo?: number; checkout: string; status?: string }) {
  const ref = `M${String(refCounter++).padStart(7, '0')}`;
  const confirmed = opts.confirmedDaysAgo === undefined ? null : new Date(now.getTime() - opts.confirmedDaysAgo * 86_400_000).toISOString();
  const checkin = new Date(Date.parse(`${opts.checkout}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
  await db.query(
    `INSERT INTO app.bookings (booking_ref, hotel_id, offer_snapshot, status, checkin, checkout, occupancy, total_price_cents, currency,
                               holder_first_name, holder_last_name, holder_email, liteapi_booking_id, confirmed_at)
     VALUES ($1, 'lp-m-1', '{"hotelName":"Wartungshaus"}', $2, $3::date, $4::date, '[]', 20000, 'EUR', 'Max', 'Muster', 'max@example.org', $5, $6::timestamptz)`,
    [ref, opts.status ?? 'confirmed', checkin, opts.checkout, confirmed ? `FKB-${ref}` : null, confirmed],
  );
  return ref;
}

const alerts = (db: Db) =>
  db.query<{ subject: string }>("SELECT payload->>'title' AS subject FROM app.email_outbox WHERE type = 'ops_alert' ORDER BY id");

describe('look-to-book watch (architektur.md 6.4 step 10)', () => {
  it('throttles new searches at 5,000 : 1 and alerts the ops address', async () => {
    await rateCalls(test.db, 40_000);
    for (let i = 0; i < 8; i += 1) await booking(test.db, { confirmedDaysAgo: 2, checkout: '2026-11-01' });
    const result = await runDaily(deps(test.db));
    expect(result.lookToBook).toEqual({ ratio: 5000, state: 'throttled', maxCombinations: 40 });
    expect(await effectiveMaxCombinations(test.db)).toBe(40);
    const mail = await test.db.query<{ to_email: string; status: string }>("SELECT to_email, status FROM app.email_outbox WHERE type = 'ops_alert'");
    expect(mail).toEqual([{ to_email: productConfig.ops.alert_email, status: 'sent' }]);
  });

  it('only alerts between the alert and the throttle level, and lifts the throttle when the ratio falls', async () => {
    await rateCalls(test.db, 40_000);
    for (let i = 0; i < 8; i += 1) await booking(test.db, { confirmedDaysAgo: 2, checkout: '2026-11-01' });
    await runDaily(deps(test.db));
    for (let i = 0; i < 4; i += 1) await booking(test.db, { confirmedDaysAgo: 1, checkout: '2026-11-01' });
    const alertOnly = await runDaily(deps(test.db));
    // Hysteresis: between alert and throttle level the throttle stays on.
    expect(alertOnly.lookToBook).toMatchObject({ state: 'alert', maxCombinations: 40 });
    for (let i = 0; i < 30; i += 1) await booking(test.db, { confirmedDaysAgo: 1, checkout: '2026-11-01' });
    const recovered = await runDaily(deps(test.db));
    expect(recovered.lookToBook).toMatchObject({ state: 'ok', maxCombinations: productConfig.limits.search.max_combinations });
    expect((await alerts(test.db)).map((a) => a.subject)).toEqual([
      'Such-zu-Buchungs-Verhältnis über der Drosselschwelle',
      'Such-zu-Buchungs-Verhältnis über der Alarmschwelle',
      'Such-zu-Buchungs-Drosselung aufgehoben',
    ]);
  });
});

describe('retention, invitations, budgets and cleanup', () => {
  it('deletes old searches, clears IP hashes and erases guest data 90 days after checkout', async () => {
    await test.db.query(
      `INSERT INTO app.searches (token_hash, request, origin_lat, origin_lng, combos_total, ip_hash, created_at) VALUES
       (repeat('1', 64), '{}', 48, 9, 1, 'h1', $1::timestamptz - interval '31 days'),
       (repeat('2', 64), '{}', 48, 9, 1, 'h2', $1::timestamptz - interval '8 days'),
       (repeat('3', 64), '{}', 48, 9, 1, 'h3', $1::timestamptz - interval '1 day')`,
      [now.toISOString()],
    );
    const old = await booking(test.db, { confirmedDaysAgo: 120, checkout: '2026-06-01' });
    const recent = await booking(test.db, { confirmedDaysAgo: 30, checkout: '2026-09-01' });
    const result = await runDaily(deps(test.db));
    expect(result.retention).toMatchObject({ searchesDeleted: 1, ipHashesCleared: 1, guestDataErased: 1 });
    expect(await test.db.query('SELECT ip_hash FROM app.searches ORDER BY created_at')).toEqual([{ ip_hash: null }, { ip_hash: 'h3' }]);
    const erased = await test.db.query<{ booking_ref: string; holder_email: string | null; pii: boolean }>(
      'SELECT booking_ref, holder_email, pii_deleted_at IS NOT NULL AS pii FROM app.bookings WHERE booking_ref = ANY($1::text[]) ORDER BY booking_ref',
      [[old, recent]],
    );
    expect(erased).toEqual([
      { booking_ref: old, holder_email: null, pii: true },
      { booking_ref: recent, holder_email: 'max@example.org', pii: false },
    ]);
  });

  it('invites guests once from the day after checkout', async () => {
    await booking(test.db, { confirmedDaysAgo: 10, checkout: '2026-09-26' });
    await booking(test.db, { confirmedDaysAgo: 10, checkout: '2026-09-27' });
    expect((await runDaily(deps(test.db))).invitesSent).toBe(1);
    expect((await runDaily(deps(test.db))).invitesSent).toBe(0);
    expect(await test.db.query("SELECT type, status FROM app.email_outbox WHERE type = 'review_invite'")).toEqual([{ type: 'review_invite', status: 'sent' }]);
  });

  it('warns when a daily budget reaches 80 %', async () => {
    await test.db.query("INSERT INTO app.budget_ledger (day, scope, reserved, settled, cap) VALUES ('2026-09-27', 'llm_usd', 0, 4.2, 5)");
    const result = await runDaily(deps(test.db));
    expect(result.budgetWarnings).toEqual(['llm_usd: 84 % von 5']);
    expect((await alerts(test.db)).map((a) => a.subject)).toContain('Tagesbudgets fast ausgeschöpft');
  });

  it('removes expired cache entries and rate limits', async () => {
    await test.db.query(
      `INSERT INTO app.cache_entries (namespace, key, value, expires_at) VALUES ('rates', repeat('a', 64), '{}', $1::timestamptz - interval '1 minute'), ('rates', repeat('b', 64), '{}', $1::timestamptz + interval '1 hour')`,
      [now.toISOString()],
    );
    await test.db.query("INSERT INTO app.rate_limits (key, count, reset_at) VALUES ('x', 3, $1::timestamptz - interval '1 second')", [now.toISOString()]);
    expect(await runCacheCleanup(deps(test.db))).toMatchObject({ cacheEntries: 1, rateLimits: 1 });
  });

  it('runs the daily job through the cron dispatcher and sends a heartbeat', async () => {
    const beats: string[] = [];
    const env = {
      APP_ENV: 'test',
      PROVIDERS_MODE: 'fake',
      LLM_ENABLED: 'true',
      LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
      LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
      LITEAPI_PAYMENT_MODE: 'sandbox',
      ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
      HYPERDRIVE: { connectionString: 'unused' },
      OPS_HEARTBEAT_URL: 'https://ops.example/',
      OPS_HB_TOKEN: 'hb-token',
    } as unknown as Env;
    const summary = await runScheduled(CRON_DAILY, env, {
      dbFactory: () => ({ ...test.db, close: async () => undefined }),
      now: () => now,
      heartbeatFetch: async (input) => {
        beats.push(String(input));
        return new Response('{}', { status: 200 });
      },
    });
    expect(summary['lookToBook.state']).toBe('ok');
    expect(beats).toEqual(['https://ops.example/heartbeat/daily']);
  });
});
