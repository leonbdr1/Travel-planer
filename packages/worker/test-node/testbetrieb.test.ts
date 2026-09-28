// Testbetrieb (HANDOFF drift 27): per-provider sources in the runtime config,
// production refuses simulated providers, caches never mix simulated and real
// values, and /meta/config tells the SPA which providers are real.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type ProvidersConfig } from '@reiseplaner/providers';
import { createApp } from '../src/app';
import { configuredSources, parseRuntimeConfig, type Env } from '../src/env';
import { ratesCacheKey } from '../src/services/search-run';
import { getTravelTimes } from '../src/services/travel-times';

const base = {
  APP_ENV: 'dev',
  PROVIDERS_MODE: 'sandbox',
  LLM_ENABLED: 'true',
  LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
  LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
  LITEAPI_PAYMENT_MODE: 'sandbox',
  ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
  HYPERDRIVE: { connectionString: 'unused' },
};
const env = (extra: Record<string, string>) => ({ ...base, ...extra }) as unknown as Env;

describe('runtime config', () => {
  it('reads per-provider sources for the local Testbetrieb', () => {
    const config = parseRuntimeConfig(env({ MAIL_SOURCE: 'fake', CATALOG_ALLOW_DRAFTS: 'true', BOOKING_ENABLED: 'false' }), 'v');
    expect(configuredSources(config)).toEqual({ liteapi: 'real', routing: 'real', llm: 'real', mail: 'fake' });
    expect(configuredSources(parseRuntimeConfig(env({ PROVIDERS_MODE: 'fake', LITEAPI_SOURCE: 'real' }), 'v'))).toEqual({
      liteapi: 'real',
      routing: 'fake',
      llm: 'fake',
      mail: 'fake',
    });
  });

  it('rejects unknown values and simulated providers in production', () => {
    expect(() => parseRuntimeConfig(env({ ROUTING_SOURCE: 'maybe' }), 'v')).toThrow(/ROUTING_SOURCE/);
    expect(() => parseRuntimeConfig(env({ APP_ENV: 'production', PROVIDERS_MODE: 'live', LITEAPI_PAYMENT_MODE: 'live', MAIL_SOURCE: 'fake' }), 'v')).toThrow(
      /not allowed in production/,
    );
  });
});

describe('caches', () => {
  let test: TestDb;
  beforeEach(async () => {
    test = await createTestDb();
  });
  afterEach(async () => test.close());

  it('never serves simulated drive times to real routing', async () => {
    const config: ProvidersConfig = {
      mode: 'fake',
      liteapi: { baseUrl: base.LITEAPI_BASE_URL, bookBaseUrl: base.LITEAPI_BOOK_BASE_URL },
      ors: { baseUrl: base.ORS_BASE_URL },
      resend: {},
      anthropic: {},
    };
    const place = { id: '00000000-0000-4000-8000-000000000001', lat: 47.5703, lng: 10.7003 };
    const origin = { lat: 48.7823, lng: 9.177 };
    const now = new Date('2026-09-28T08:00:00Z');
    const fake = await getTravelTimes({ db: test.db, routing: createProviders(config).routing, routingSource: 'fake', now, orsDailyCap: 450 }, origin, [place]);
    expect(fake.stats.routed).toBe(1);
    // Real routing without key: the simulated row is not reused, the fallback is a marked estimate.
    const realRouting = createProviders({ ...config, mode: 'sandbox' }).routing;
    const real = await getTravelTimes({ db: test.db, routing: realRouting, routingSource: 'real', now, orsDailyCap: 450 }, origin, [place]);
    expect(real.stats).toMatchObject({ cached: 0, estimated: 1 });
    expect(real.times.get(place.id)?.estimated).toBe(true);
  });

  it('keys cached rates by the LiteAPI source', async () => {
    const combination = { placeId: '00000000-0000-4000-8000-000000000001', checkin: '2026-10-09', checkout: '2026-10-11' };
    const deps = { db: test.db, liteapi: createProviders({ mode: 'fake', liteapi: { baseUrl: 'x', bookBaseUrl: 'x' }, ors: { baseUrl: 'x' }, resend: {}, anthropic: {} }).liteapi, now: () => new Date(), liteapiDailyCap: 1, currency: 'EUR', guestNationality: 'DE' };
    const occupancies = [{ adults: 2, childrenAges: [] }];
    const fakeKey = await ratesCacheKey(combination, occupancies, { ...deps, liteapiSource: 'fake' });
    expect(await ratesCacheKey(combination, occupancies, deps)).toBe(fakeKey);
    expect(await ratesCacheKey(combination, occupancies, { ...deps, liteapiSource: 'real' })).not.toBe(fakeKey);
  });
});

describe('/meta/config', () => {
  it('reports the effective source of every provider', async () => {
    const test = await createTestDb();
    try {
      const app = createApp({ dbFactory: () => ({ ...test.db, close: async () => undefined }) });
      const res = await app.request('/api/v1/meta/config', {}, env({ MAIL_SOURCE: 'fake', BOOKING_ENABLED: 'false' }) as never);
      const body = (await res.json()) as { provider_sources: unknown; booking_enabled: boolean };
      expect(body.provider_sources).toEqual({ liteapi: 'real', routing: 'real', llm: 'real', mail: 'fake' });
      expect(body.booking_enabled).toBe(false);
    } finally {
      await test.close();
    }
  });
});
