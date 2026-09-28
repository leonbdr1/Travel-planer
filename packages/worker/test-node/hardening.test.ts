// Hardening (architektur.md 11.1, S9.3): SPA headers file in sync with the
// middleware's source, API security headers, log redaction, and a booking
// run through the HTTP layer whose logs and responses contain no full
// e-mail address and no token except where one is handed out on purpose.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearch, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type ProvidersConfig } from '@reiseplaner/providers';
import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { redactForLog } from '../src/http/log';
import { apiSecurityHeaders, renderHeadersFile } from '../src/http/security-headers';
import { runLoad, runRatesBlock, runScoreStep, sha256Hex } from '../src/services/search-run';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const EMAIL = 'erika.mustermann@example.org';
const SEARCH_TOKEN = 'hardening-search-token-0123456789abcdef';
const env = {
  APP_ENV: 'test',
  PROVIDERS_MODE: 'fake',
  LLM_ENABLED: 'true',
  LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
  LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
  LITEAPI_PAYMENT_MODE: 'sandbox',
  ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
  HYPERDRIVE: { connectionString: 'unused' },
  SIGNING_KEY: 'hardening-signing-key-not-secret',
  ALTCHA_HMAC_KEY: 'hardening-altcha-key',
  IP_HASH_SALT: 'salt',
} as unknown as Env;

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await test.close();
});

describe('headers', () => {
  it('keeps packages/web/public/_headers in sync with spaSecurityHeaders', () => {
    const file = readFileSync(resolve(import.meta.dirname, '../../web/public/_headers'), 'utf8');
    expect(file).toBe(renderHeadersFile());
    expect(file).toContain("frame-ancestors 'none'");
  });

  it('sends the API security headers on every response', async () => {
    const db: Db = { ...test.db, close: async () => undefined };
    const app = createApp({ dbFactory: () => db });
    const res = await app.request('/api/v1/meta/config', {}, env as never);
    for (const [name, value] of Object.entries(apiSecurityHeaders)) expect(res.headers.get(name), name).toBe(value);
  });
});

describe('coarse rate limit (RATE_LIMITER binding)', () => {
  const request = (app: ReturnType<typeof createApp>, path: string, e: Env, ip = '203.0.113.7') =>
    app.request(`/api/v1${path}`, { headers: { 'cf-connecting-ip': ip } }, e as never);

  it('answers 429 once the binding refuses, but never for health', async () => {
    const db: Db = { ...test.db, close: async () => undefined };
    let calls = 0;
    const limiter = { limit: async () => ({ success: ++calls <= 2 }) };
    const app = createApp({ dbFactory: () => db });
    const e = { ...env, RATE_LIMITER: limiter } as Env;
    expect((await request(app, '/meta/config', e)).status).toBe(200);
    expect((await request(app, '/meta/config', e)).status).toBe(200);
    const refused = await request(app, '/meta/config', e);
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('60');
    expect(((await refused.json()) as { error: { code: string } }).error.code).toBe('rate_limited');
    expect((await request(app, '/health', e)).status).toBe(200);
    expect(calls).toBe(3);
  });

  it('lets requests through when the binding fails (the RPC stage stays binding)', async () => {
    const db: Db = { ...test.db, close: async () => undefined };
    const lines: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void lines.push(args.map(String).join(' ')));
    const app = createApp({ dbFactory: () => db });
    const e = { ...env, RATE_LIMITER: { limit: async () => Promise.reject(new Error('boom')) } } as Env;
    expect((await request(app, '/meta/config', e)).status).toBe(200);
    expect(lines.some((l) => l.includes('rate limiter binding failed'))).toBe(true);
  });

  it('keys by a salted IP hash that changes with the UTC date', async () => {
    const db: Db = { ...test.db, close: async () => undefined };
    const keys: string[] = [];
    const e = { ...env, RATE_LIMITER: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: true }) } } as Env;
    const at = (iso: string) => createApp({ dbFactory: () => db, now: () => new Date(iso) });
    await request(at('2026-09-27T08:00:00Z'), '/meta/config', e);
    await request(at('2026-09-27T23:59:00Z'), '/meta/config', e);
    await request(at('2026-09-28T00:01:00Z'), '/meta/config', e);
    await request(at('2026-09-28T00:01:00Z'), '/meta/config', e, '198.51.100.1');
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
    expect(keys[3]).not.toBe(keys[2]);
    for (const key of keys) expect(key).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('log redaction', () => {
  it('masks e-mail addresses and removes token-like strings', () => {
    expect(redactForLog(`mail to ${EMAIL} failed`)).toBe('mail to e***@example.org failed');
    expect(redactForLog('token eyJiIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIn0.abcdefghijklmnopqrstuv')).toBe('token [redacted]');
    expect(redactForLog('search 00000000-0000-4000-8000-000000000001 done')).toBe('search 00000000-0000-4000-8000-000000000001 done');
  });
});

describe('booking over HTTP: no e-mail addresses or tokens in logs and responses', () => {
  it('runs create, complete, view, cancel and access-link without leaking', async () => {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => void lines.push(args.map(String).join(' '));
    vi.spyOn(console, 'log').mockImplementation(capture);
    vi.spyOn(console, 'error').mockImplementation(capture);
    vi.spyOn(console, 'warn').mockImplementation(capture);

    const now = () => new Date('2026-09-27T08:00:00Z');
    const providers = createProviders(config, { now, sleep: async () => undefined, fake: { mailFailNext: { remaining: 2 } } });
    const db: Db = { ...test.db, close: async () => undefined };
    await test.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES (990701, 'Füssen', 'Fussen', 'DE', '02', 47.57143, 10.70171, 15000, 'PPL', 'fussen')`,
    );
    const place = await test.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ('ort-990701', 'Füssen', 990701, 'DE', 47.57143, 10.70171, 'user', false) RETURNING id::text AS id`,
    );
    const { id: searchId } = await createSearch(test.db, {
      tokenHash: await sha256Hex(SEARCH_TOKEN),
      request: {
        origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78, lng: 9.18 },
        max_drive_minutes: 240,
        themes: [],
        window: { start: '2026-10-01', end: '2026-10-12' },
        nights: 2,
        arrival_weekdays: [5],
        occupancy: { rooms: 1, adults: 2, children_ages: [] },
        budget_total_eur: null,
        filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
        chips: [],
        place_ids: [place[0]?.id ?? ''],
      },
      originLat: 48.78,
      originLng: 9.18,
      ipHash: null,
      places: [{ placeId: place[0]?.id ?? '', driveMinutes: 150, source: 'user' }],
      dates: [{ checkin: '2026-10-09', checkout: '2026-10-11' }],
    });
    const runDeps = { db: test.db, liteapi: providers.liteapi, now, liteapiDailyCap: 60_000, currency: 'EUR', guestNationality: 'DE' };
    const { blocks } = await runLoad(runDeps, searchId);
    for (let i = 0; i < blocks; i += 1) await runRatesBlock(runDeps, searchId, i);
    await runScoreStep(runDeps, searchId);
    const offers = await test.db.query<{ id: string }>('SELECT id::text AS id FROM app.offers WHERE search_id = $1::uuid AND refundable ORDER BY id', [searchId]);

    const app = createApp({ dbFactory: () => db, providersFactory: () => providers, now });
    const call = async (method: string, path: string, body?: unknown, token?: string) => {
      const res = await app.request(
        `/api/v1${path}`,
        { method, headers: { 'content-type': 'application/json', ...(token ? { 'x-booking-token': token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
        env as never,
      );
      return { status: res.status, text: await res.text() };
    };

    let created: { booking_ref: string; session_token: string; price_changed: boolean } | undefined;
    for (const o of offers) {
      const res = await call('POST', '/bookings', {
        search_id: searchId,
        search_token: SEARCH_TOKEN,
        offer_id: o.id,
        holder: { first_name: 'Erika', last_name: 'Mustermann', email: EMAIL, phone: '+49 170 1234567' },
        guests: [{ room: 1, first_name: 'Erika', last_name: 'Mustermann' }],
        accepted_terms: true,
        acknowledged_no_withdrawal: true,
      });
      expect(res.status).toBe(201);
      const body = JSON.parse(res.text) as typeof created & object;
      if (!body.price_changed) {
        created = body;
        break;
      }
    }
    if (!created) throw new Error('no offer without price change');
    const complete = await call('POST', `/bookings/${created.booking_ref}/complete`, {}, created.session_token);
    expect(complete.status).toBe(200);
    const accessToken = (JSON.parse(complete.text) as { access_token: string }).access_token;
    const forbidden = await call('GET', `/bookings/${created.booking_ref}`, undefined, created.session_token);
    expect(forbidden.status).toBe(403);
    const view = await call('GET', `/bookings/${created.booking_ref}`, undefined, accessToken);
    const cancel = await call('POST', `/bookings/${created.booking_ref}/cancel`, { dry_run: false }, accessToken);
    expect(cancel.status).toBe(200);

    // The confirmation e-mail failed once (injected); its failure was logged.
    expect(lines.some((l) => l.includes('e-mail send failed'))).toBe(true);
    const secrets = [EMAIL, created.session_token, accessToken, SEARCH_TOKEN, '1234567'];
    for (const line of lines) for (const secret of secrets) expect(line.includes(secret), `log leaks ${secret.slice(0, 6)}…: ${line}`).toBe(false);
    for (const res of [view, cancel, forbidden]) {
      expect(res.text.includes(EMAIL)).toBe(false);
      expect(res.text.includes(accessToken)).toBe(false);
      expect(res.text.includes(created.session_token)).toBe(false);
    }
    expect(view.text).toContain('e***@example.org');
  });
});
