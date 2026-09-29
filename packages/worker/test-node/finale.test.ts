// Finale over HTTP (S11.1–S11.3, architektur.md 6.15) against PGlite and the
// simulated world: the goal of the search steers the review check and the
// pre-selection, every house is accounted for (finalist, runner-up or a
// reason), the finalists come cheapest first with surcharge and comparison,
// run-down 4-star houses never reach the finale, and switching the goal needs
// no new search.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { finaleResponseSchema, hotelDetailResponseSchema, searchResultsResponseSchema, type FinaleResponse } from '@reiseplaner/contracts';
import { createSearch, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { constants, hasRedFlag, NO_EVIDENCE, type Goal } from '@reiseplaner/domain';
import { createProviders, hasFallenHotel, hotelCountAt, type ProvidersConfig } from '@reiseplaner/providers';
import { fakeResponders } from '@reiseplaner/skills';
import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { runLocationFacts, type LocationRunDeps } from '../src/services/location';
import { loadReviewData, runReviewsFetch, runReviewsVerify, type ReviewRunDeps } from '../src/services/reviews';
import { runFinalize, runLoad, runRatesBlock, runScoreStep, sha256Hex } from '../src/services/search-run';

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
  LLM_ENABLED: 'true',
  LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
  LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
  LITEAPI_PAYMENT_MODE: 'sandbox',
  ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
  HYPERDRIVE: { connectionString: 'unused' },
  SIGNING_KEY: 'finale-signing-key-not-secret',
  ALTCHA_HMAC_KEY: 'finale-altcha-key',
  IP_HASH_SALT: 'salt',
} as unknown as Env;
const now = () => new Date('2026-09-27T08:00:00Z');
const TOKEN = 'finale-search-token-0123456789abcdef';

// Füssen plus the first two nearby places with a run-down 4-star house.
const CANDIDATES = [
  ['Füssen', 47.57143, 10.70171],
  ['Schwangau', 47.5776, 10.7394],
  ['Pfronten', 47.5833, 10.55],
  ['Nesselwang', 47.6236, 10.5025],
  ['Halblech', 47.6333, 10.8167],
  ['Seeg', 47.6547, 10.6092],
  ['Roßhaupten', 47.6453, 10.7167],
  ['Lechbruck', 47.7011, 10.7978],
] as const;
const anchor = (lat: number, lng: number) => [Math.round(lat * 100), Math.round(lng * 100)] as const;
const WITH_FALLEN = CANDIDATES.slice(1).filter(([, lat, lng]) => hasFallenHotel(...anchor(lat, lng)));
const PLACES = [CANDIDATES[0], ...WITH_FALLEN.slice(0, 2)];
// The run-down house of a place is the one after its regular hotels.
const FALLEN_IDS = PLACES.flatMap(([, lat, lng]) => {
  const [latE2, lngE2] = anchor(lat, lng);
  return hasFallenHotel(latE2, lngE2) ? [`lpf-${latE2}-${lngE2}-${hotelCountAt(latE2, lngE2)}`] : [];
});

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => test.close());

type Deps = ReviewRunDeps & LocationRunDeps;

async function searched(goal: Goal | undefined): Promise<{ id: string; deps: Deps; providers: ReturnType<typeof createProviders> }> {
  const providers = createProviders(config, { now, fake: { llmResponders: fakeResponders }, sleep: async () => undefined });
  const placeIds: string[] = [];
  for (const [i, [name, lat, lng]] of PLACES.entries()) {
    await test.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES ($1, $2, $2, 'DE', '02', $3, $4, 9000, 'PPL', lower($2))`,
      [990800 + i, name, lat, lng],
    );
    const rows = await test.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ($1, $2, $3, 'DE', $4, $5, 'user', false) RETURNING id::text AS id`,
      [`ort-finale-${i}`, name, 990800 + i, lat, lng],
    );
    placeIds.push(rows[0]?.id ?? '');
  }
  const { id } = await createSearch(test.db, {
    tokenHash: await sha256Hex(TOKEN),
    request: {
      ...(goal ? { goal } : {}),
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
    dates: [
      { checkin: '2026-10-02', checkout: '2026-10-04' },
      { checkin: '2026-10-09', checkout: '2026-10-11' },
    ],
  });
  const deps: Deps = {
    db: test.db,
    poi: providers.poi,
    poiSource: 'fake',
    liteapi: providers.liteapi,
    llm: providers.llm,
    llmEnabled: true,
    llmDailyBudgetUsd: 5,
    now,
    liteapiDailyCap: 60_000,
    currency: 'EUR',
    guestNationality: 'DE',
  };
  const { blocks } = await runLoad(deps, id);
  for (let i = 0; i < blocks; i += 1) await runRatesBlock(deps, id, i);
  await runScoreStep(deps, id);
  await runReviewsFetch(deps, id);
  await runReviewsVerify(deps, id);
  // Follow-up rounds as in the workflow: finalists that moved in unchecked.
  followUps = [];
  for (let round = 2; round <= 1 + constants.REVIEW_FOLLOWUP_ROUNDS; round += 1) {
    const followUp = await runReviewsFetch(deps, id, round);
    followUps.push(followUp.candidates);
    if (followUp.candidates === 0) break;
    await runReviewsVerify(deps, id);
  }
  locationRun = await runLocationFacts(deps, id);
  await runFinalize(deps, id);
  return { id, deps, providers };
}

let followUps: number[] = [];
let locationRun: Awaited<ReturnType<typeof runLocationFacts>> | undefined;

async function get(providers: ReturnType<typeof createProviders>, path: string) {
  const db: Db = { ...test.db, close: async () => undefined };
  const app = createApp({ dbFactory: () => db, providersFactory: () => providers, now });
  const res = await app.request(`/api/v1${path}`, { headers: { 'x-search-token': TOKEN } }, env as never);
  return { status: res.status, body: (await res.json()) as unknown };
}

const finaleOf = async (providers: ReturnType<typeof createProviders>, id: string, query = '') => {
  const res = await get(providers, `/searches/${id}/finale${query}`);
  expect(res.status).toBe(200);
  return finaleResponseSchema.parse(res.body);
};

async function expectConsistent(finale: FinaleResponse, searchId: string) {
  const excluded = Object.values(finale.excluded).reduce((a, b) => a + b, 0);
  expect(excluded + finale.finalists.length + finale.runners_up).toBe(finale.hotels);
  expect(finale.finalists.length).toBeLessThanOrEqual(constants.FINALISTS_MAX);
  expect(new Set(finale.finalists.map((f) => f.hotel.id)).size).toBe(finale.finalists.length);
  const [first, ...rest] = finale.finalists;
  if (!first) return;
  expect(first.price_delta_eur).toBe(0);
  expect(first.gains).toEqual([]);
  expect(first.losses).toEqual([]);
  let previous = first.offer.total_price_eur;
  for (const f of rest) {
    expect(f.offer.total_price_eur).toBeGreaterThanOrEqual(previous);
    expect(f.price_delta_eur).toBeCloseTo(f.offer.total_price_eur - first.offer.total_price_eur, 2);
    previous = f.offer.total_price_eur;
  }
  // No red flags in the finale: mould, vermin or dirt out of hand, by the stored review checks.
  const { evidence } = await loadReviewData(test.db, searchId, []);
  for (const f of finale.finalists) expect(hasRedFlag(evidence?.get(f.hotel.id) ?? NO_EVIDENCE), f.hotel.name).toBe(false);
}

describe('finale (architektur.md 6.15)', () => {
  it('takes the goal from the search and accounts for every house', async () => {
    expect(WITH_FALLEN.length).toBeGreaterThan(0);
    const { id, providers } = await searched('sparen');
    const finale = await finaleOf(providers, id);
    expect(finale.goal).toBe('sparen');
    expect(finale.finalists.length).toBeGreaterThan(0);
    await expectConsistent(finale, id);
    // "Günstig und sauber" sorts out the expensive houses; the run-down 4-star houses are in the
    // search with budget prices but never make it into the finale.
    expect(finale.excluded.too_expensive).toBeGreaterThan(0);
    expect(finale.excluded.star_trap + finale.excluded.low_quality).toBeGreaterThan(0);
    expect(finale.finalists.filter((f) => FALLEN_IDS.includes(f.hotel.id))).toEqual([]);
    // The list shows only houses that pass the goal's rules (Ben, 2026-09-28): the
    // run-down houses stay out of it too, not only out of the finale. Sorted-out houses
    // without reviews come apart below it (Ben, 2026-09-29).
    const results = searchResultsResponseSchema.parse((await get(providers, `/searches/${id}/results?sort=price`)).body);
    expect(results.items.some((i) => FALLEN_IDS.includes(i.hotel.id))).toBe(false);
    expect(results.unrated.some((i) => FALLEN_IDS.includes(i.hotel.id))).toBe(false);
    expect(results.counts.unrated_hidden).toBe(finale.excluded.no_reviews);
    expect(results.counts.hidden).toBe(finale.excluded.no_reviews + finale.excluded.red_flag + finale.excluded.star_trap + finale.excluded.low_quality);
  });

  it('switches the goal without a new search: "Komfort" drops the price window', async () => {
    const { id, providers, deps } = await searched('sparen');
    const komfort = await finaleOf(providers, id, '?goal=komfort');
    expect(komfort.goal).toBe('komfort');
    expect(komfort.excluded.too_expensive).toBe(0);
    await expectConsistent(komfort, id);
    // The review check covered the finalists of every goal, not only of "sparen",
    // with bounded follow-up rounds.
    expect(komfort.finalists.filter((f) => f.review_status === 'none').map((f) => f.hotel.name)).toEqual([]);
    expect(followUps.length).toBeLessThanOrEqual(constants.REVIEW_FOLLOWUP_ROUNDS);
    for (const n of followUps) expect(n).toBeLessThanOrEqual(constants.REVIEW_FOLLOWUP_MAX);
    // Repeating a follow-up round fetches nothing twice.
    const again = await runReviewsFetch(deps, id, 2);
    expect(again.reused + again.fetched).toBe(again.candidates);
    const sparen = await finaleOf(providers, id, '?goal=sparen');
    const cheapest = (f: FinaleResponse) => f.finalists[0]?.offer.total_price_eur ?? 0;
    expect(cheapest(komfort)).toBeGreaterThanOrEqual(cheapest(sparen));
    expect((await get(providers, `/searches/${id}/finale?goal=luxus`)).status).toBe(400);
  });

  it('shows walking minutes from OpenStreetMap for the finalists, fetched once per search and cached', async () => {
    const { id, providers, deps } = await searched('ausgewogen');
    expect(locationRun?.fetched).toBeGreaterThan(0);
    expect(locationRun?.failed).toBe(false);
    const finale = await finaleOf(providers, id);
    const labels = finale.finalists.flatMap((f) => f.features.filter((x) => x.code.startsWith('lage_')).map((x) => x.label));
    expect(labels.some((l) => /^\d+ min zu/.test(l))).toBe(true);
    // Every finalist of every goal has facts: the step covered them all, a repeat fetches nothing.
    const again = await runLocationFacts(deps, id);
    expect(again.fetched).toBe(0);
    expect(again.reused).toBe(again.houses);
    // Without the service the finale still works, only without walking minutes.
    const down = await runLocationFacts({ ...deps, poiSource: 'real', poi: { around: async () => Promise.reject(new Error('down')) } }, id);
    expect(down.failed).toBe(true);
  });

  it('uses the default goal for searches without one and follows the list filters', async () => {
    const { id, providers } = await searched(undefined);
    const finale = await finaleOf(providers, id);
    expect(finale.goal).toBe('ausgewogen');
    await expectConsistent(finale, id);
    const budget = Math.floor((finale.finalists[0]?.offer.total_price_eur ?? 100) + 1);
    const filtered = await finaleOf(providers, id, `?budget=${budget}`);
    expect(filtered.filters.budget_total_eur).toBe(budget);
    for (const f of filtered.finalists) expect(f.offer.total_price_eur).toBeLessThanOrEqual(budget);
    expect(filtered.excluded.filters).toBeGreaterThan(finale.excluded.filters);
  });

  it('shows praise labels in list, finale and detail, with the counts behind them', async () => {
    const { id, providers } = await searched('ausgewogen');
    const results = searchResultsResponseSchema.parse((await get(providers, `/searches/${id}/results`)).body);
    const labelled = results.items.filter((i) => i.labels.length > 0);
    expect(labelled.length).toBeGreaterThan(0);
    const item = labelled[0];
    const detail = hotelDetailResponseSchema.parse((await get(providers, `/searches/${id}/hotels/${encodeURIComponent(item?.hotel.id ?? '')}`)).body);
    expect(detail.review_check?.labels).toEqual(item?.labels);
    for (const label of item?.labels ?? []) {
      const count = detail.review_check?.praise.find((p) => p.topic === label.topic);
      expect(count?.praised).toBeGreaterThanOrEqual(constants.PRAISE_MIN_MENTIONS);
      expect((count?.praised ?? 0) / ((count?.praised ?? 0) + (count?.criticized ?? 0))).toBeGreaterThanOrEqual(constants.PRAISE_MIN_SHARE);
    }
    const finale = await finaleOf(providers, id);
    for (const f of finale.finalists) {
      const listed = results.items.find((i) => i.hotel.id === f.hotel.id);
      expect(f.labels).toEqual(listed?.labels ?? []);
      for (const label of f.labels) expect(f.features.map((x) => x.code)).toContain(`lob_${label.topic}`);
    }
  });
});
