// External ratings (Testbetrieb 2026-09-29): houses without or with few ratings
// in LiteAPI get a second source; the evaluation reads the fused value, each
// house is asked once per TTL, the daily budget `rating_calls` is a hard cap and
// a source with an unverified contract is never called.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { finaleResponseSchema } from '@reiseplaner/contracts';
import { createSearch, loadEvaluationData } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createFakeRatingSource, createProviders, createUnverifiedRatingSource, type LiteApiPort, type RatingSourcePort } from '@reiseplaner/providers';
import { runExternalRatings } from '../src/services/external-ratings';
import { runHotelContent } from '../src/services/hotel-content';
import { runLoad, runRatesBlock, sha256Hex, type SearchRunDeps } from '../src/services/search-run';

const now = () => new Date('2026-09-27T08:00:00Z');
const TOKEN = 'content-search-token-0123456789abcdef';
const PLACES = [
  ['Füssen', 47.57143, 10.70171],
  ['Schwangau', 47.5776, 10.7394],
] as const;

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

const liteapi = () =>
  createProviders({
    mode: 'fake',
    liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
    ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
    resend: {},
    anthropic: {},
  }).liteapi;

function counting(): { port: RatingSourcePort; calls: { n: number } } {
  const calls = { n: 0 };
  return { port: createFakeRatingSource({ onCall: () => (calls.n += 1) }), calls };
}

describe('step external-ratings', () => {
  it('fuses a second source into houses without or with few ratings, asking each house once', async () => {
    const { id, deps } = await ratesOnly(liteapi());
    await runHotelContent({ ...deps, liteapi: liteapi() }, id);
    const before = await loadEvaluationData(test.db, id);
    const weak = before.hotels.filter((h) => h.rating === null || (h.reviewCount ?? 0) < 30);
    expect(weak.length).toBeGreaterThan(0);

    const { port, calls } = counting();
    const ext = { db: test.db, ratings: port, now, ratingDailyCap: 1000 };
    const first = await runExternalRatings(ext, id);
    expect(first.candidates).toBe(weak.length);
    expect(first.found).toBeGreaterThan(0);
    expect(first.found + first.notFound).toBe(first.candidates);
    expect(calls.n).toBe(first.candidates);

    const after = await loadEvaluationData(test.db, id);
    const fused = after.hotels.filter((h) => h.ratingFused);
    expect(fused.length).toBe(first.found);
    for (const h of fused) {
      expect(h.rating).not.toBeNull();
      expect(h.ratingSources).toEqual(['Tripadvisor']);
    }
    for (const h of after.hotels.filter((x) => !x.ratingFused)) expect(h.ratingSources).toEqual([]);
    // Houses with enough own ratings are untouched.
    for (const h of before.hotels.filter((x) => !weak.includes(x))) expect(after.hotels.find((a) => a.id === h.id)).toEqual(h);

    const second = await runExternalRatings(ext, id);
    expect(second.candidates).toBe(0);
    expect(calls.n).toBe(first.candidates);
  });

  it('asks again after the cache entry expired', async () => {
    const { id, deps } = await ratesOnly(liteapi());
    await runHotelContent({ ...deps, liteapi: liteapi() }, id);
    const { port } = counting();
    const first = await runExternalRatings({ db: test.db, ratings: port, now, ratingDailyCap: 1000 }, id);
    const later = () => new Date(now().getTime() + 31 * 86_400_000);
    const again = await runExternalRatings({ db: test.db, ratings: port, now: later, ratingDailyCap: 1000 }, id);
    expect(again.candidates).toBe(first.candidates);
  });

  it('respects the daily budget: no lookup beyond the cap', async () => {
    const { id, deps } = await ratesOnly(liteapi());
    await runHotelContent({ ...deps, liteapi: liteapi() }, id);
    const { port, calls } = counting();
    const result = await runExternalRatings({ db: test.db, ratings: port, now, ratingDailyCap: 2 }, id);
    expect(calls.n).toBe(2);
    expect(result.skipped).toBe(result.candidates - 2);
  });

  it('does nothing while the source contract is unverified', async () => {
    const { id, deps } = await ratesOnly(liteapi());
    await runHotelContent({ ...deps, liteapi: liteapi() }, id);
    const result = await runExternalRatings({ db: test.db, ratings: createUnverifiedRatingSource(), now, ratingDailyCap: 1000 }, id);
    expect(result).toEqual({ candidates: 0, found: 0, notFound: 0, failed: 0, skipped: 0 });
    expect((await loadEvaluationData(test.db, id)).hotels.some((h) => h.ratingFused)).toBe(false);
  });
});
