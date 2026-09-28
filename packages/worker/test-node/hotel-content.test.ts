// Hotel content (Testbetrieb finding 2026-09-28): the real LiteAPI rates answer
// names only id, name, photo, address and rating per house. Without the step
// `hotel-content` every house counted as unrated and the finale stayed empty;
// with it review count, stars, coordinates and facilities come from the
// hotel details, once per house and then from the cache.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { finaleResponseSchema } from '@reiseplaner/contracts';
import { createSearch, hotelsMissingContent, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type LiteApiPort, type ProvidersConfig } from '@reiseplaner/providers';
import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { runHotelContent } from '../src/services/hotel-content';
import { runFinalize, runLoad, runRatesBlock, runScoreStep, sha256Hex, type SearchRunDeps } from '../src/services/search-run';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const env = {
  APP_ENV: 'test',
  PROVIDERS_MODE: 'fake',
  LLM_ENABLED: 'false',
  LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
  LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
  LITEAPI_PAYMENT_MODE: 'sandbox',
  ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
  HYPERDRIVE: { connectionString: 'unused' },
  SIGNING_KEY: 'content-signing-key-not-secret',
  ALTCHA_HMAC_KEY: 'content-altcha-key',
  IP_HASH_SALT: 'salt',
} as unknown as Env;
const now = () => new Date('2026-09-27T08:00:00Z');
const TOKEN = 'content-search-token-0123456789abcdef';
const PLACES = [
  ['Füssen', 47.57143, 10.70171],
  ['Schwangau', 47.5776, 10.7394],
] as const;

/** The simulated LiteAPI with the rates answer cut down to the fields the real one returns. */
function realShaped(liteapi: LiteApiPort, calls: { details: number }, failDetails = false): LiteApiPort {
  return {
    ...liteapi,
    async searchRates(request) {
      const rates = await liteapi.searchRates(request);
      return {
        ...rates,
        hotels: rates.hotels.map((h) => ({ ...h, city: null, countryCode: null, lat: null, lng: null, stars: null, reviewCount: null, hotelType: null, facilityIds: [] })),
      };
    },
    async getHotel(hotelId) {
      calls.details += 1;
      if (failDetails) throw new Error('details unavailable');
      return liteapi.getHotel(hotelId);
    },
  };
}

let test: TestDb;
let placeIds: string[];
beforeEach(async () => {
  test = await createTestDb();
  placeIds = [];
  for (const [i, [name, lat, lng]] of PLACES.entries()) {
    await test.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES ($1, $2, $2, 'DE', '02', $3, $4, 9000, 'PPL', lower($2))`,
      [990900 + i, name, lat, lng],
    );
    const rows = await test.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ($1, $2, $3, 'DE', $4, $5, 'user', false) RETURNING id::text AS id`,
      [`ort-content-${i}`, name, 990900 + i, lat, lng],
    );
    placeIds.push(rows[0]?.id ?? '');
  }
});
afterEach(async () => test.close());

async function ratesOnly(liteapi: LiteApiPort): Promise<{ id: string; deps: SearchRunDeps }> {
  const { id } = await createSearch(test.db, {
    tokenHash: await sha256Hex(TOKEN),
    request: {
      goal: 'sparen',
      origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78, lng: 9.18 },
      max_drive_minutes: 240,
      themes: [],
      window: { start: '2026-10-01', end: '2026-10-20' },
      nights: 2,
      arrival_weekdays: [5],
      occupancy: { rooms: 1, adults: 2, children_ages: [] },
      budget_total_eur: null,
      filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
      chips: [],
      place_ids: placeIds,
    },
    originLat: 48.78,
    originLng: 9.18,
    ipHash: null,
    places: placeIds.map((placeId) => ({ placeId, driveMinutes: 150, source: 'user' as const })),
    dates: [{ checkin: '2026-10-02', checkout: '2026-10-04' }],
  });
  const deps: SearchRunDeps = { db: test.db, liteapi, now, liteapiDailyCap: 60_000, currency: 'EUR', guestNationality: 'DE' };
  const { blocks } = await runLoad(deps, id);
  for (let i = 0; i < blocks; i += 1) await runRatesBlock(deps, id, i);
  return { id, deps };
}

async function finale(providers: ReturnType<typeof createProviders>, id: string) {
  const db: Db = { ...test.db, close: async () => undefined };
  const app = createApp({ dbFactory: () => db, providersFactory: () => providers, now });
  const res = await app.request(`/api/v1/searches/${id}/finale`, { headers: { 'x-search-token': TOKEN } }, env as never);
  expect(res.status).toBe(200);
  return finaleResponseSchema.parse(await res.json());
}

const unrated = async (id: string) =>
  (
    await test.db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM app.hotels WHERE review_count IS NULL AND id IN (SELECT hotel_id FROM app.offers WHERE search_id = $1::uuid)`,
      [id],
    )
  )[0]?.n;

describe('hotel content', () => {
  it('fills review count, stars, coordinates and facilities from the details, so the finale is not empty', async () => {
    const providers = createProviders(config, { now, sleep: async () => undefined });
    const calls = { details: 0 };
    const { id, deps } = await ratesOnly(realShaped(providers.liteapi, calls));
    const missing = await hotelsMissingContent(test.db, id);
    expect(missing.length).toBeGreaterThan(5);
    expect(await unrated(id)).toBe(missing.length);

    const result = await runHotelContent(deps, id);
    expect(result).toMatchObject({ missing: missing.length, fetched: missing.length, reused: 0, failed: 0, skipped: 0 });
    expect(calls.details).toBe(missing.length);
    expect(await unrated(id)).toBe(0);
    const rows = await test.db.query<{ id: string; lat: number | null; stars: number | null; facilities: number }>(
      `SELECT id, lat::float8 AS lat, stars::float8 AS stars, cardinality(facility_ids)::int AS facilities FROM app.hotels WHERE id = ANY($1::text[])`,
      [missing],
    );
    expect(rows).toHaveLength(missing.length);
    let withoutReviews = 0;
    for (const row of rows) {
      const details = await providers.liteapi.getHotel(row.id);
      expect(row.lat).not.toBeNull();
      expect(row.stars).toBe(details.stars);
      expect(row.facilities).toBe(details.facilityIds.length);
      if (!details.reviewCount) withoutReviews += 1;
    }

    await runScoreStep(deps, id);
    await runFinalize(deps, id);
    const f = await finale(providers, id);
    expect(f.finalists.length).toBeGreaterThan(0);
    // Only houses that really have no reviews can still be out for it.
    expect(f.excluded.no_reviews).toBeLessThanOrEqual(withoutReviews);
  });

  it('without the step every house counts as unrated and the finale is empty (the Testbetrieb finding)', async () => {
    const providers = createProviders(config, { now, sleep: async () => undefined });
    const { id, deps } = await ratesOnly(realShaped(providers.liteapi, { details: 0 }));
    await runScoreStep(deps, id);
    await runFinalize(deps, id);
    const f = await finale(providers, id);
    expect(f.finalists).toEqual([]);
    expect(f.excluded.no_reviews).toBe(f.hotels);
  });

  it('keeps filled values when later rates answers lack them and reuses the cached details', async () => {
    const providers = createProviders(config, { now, sleep: async () => undefined });
    const calls = { details: 0 };
    const liteapi = realShaped(providers.liteapi, calls);
    const first = await ratesOnly(liteapi);
    await runHotelContent(first.deps, first.id);
    const fetched = calls.details;

    // A second search: the rates answer (here from the rates cache) has no counts, the stored ones stay.
    const second = await ratesOnly(liteapi);
    expect(await hotelsMissingContent(test.db, second.id)).toEqual([]);

    // Houses that lost their data again are filled from the details cache, without a call.
    await test.db.query(`UPDATE app.hotels SET review_count = NULL, stars = NULL`);
    const again = await runHotelContent(second.deps, second.id);
    expect(again).toMatchObject({ fetched: 0, failed: 0 });
    expect(again.reused).toBe(again.missing);
    expect(calls.details).toBe(fetched);
    expect(await unrated(second.id)).toBe(0);
  });

  it('leaves houses unrated when the details fail, without failing the step', async () => {
    const providers = createProviders(config, { now, sleep: async () => undefined });
    const calls = { details: 0 };
    const { id, deps } = await ratesOnly(realShaped(providers.liteapi, calls, true));
    const result = await runHotelContent(deps, id);
    expect(result.failed).toBe(result.missing);
    expect(await unrated(id)).toBe(result.missing);
  });
});
