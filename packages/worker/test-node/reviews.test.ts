// Review check steps against PGlite with the simulated LiteAPI and the fake
// model: reviews-fetch → reviews-verify → finalize (score stage 2). Füssen's
// "Hotel Schwanen" has exactly three mould complaints in the last six months
// in the simulated world (konzept.md 5.1 example 4).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSearch, getReviewChecks, getSearch, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type ProvidersConfig } from '@reiseplaner/providers';
import { fakeResponders } from '@reiseplaner/skills';
import { runReviewsFetch, runReviewsVerify, type ReviewRunDeps } from '../src/services/reviews';
import { runFinalize, runLoad, runRatesBlock, runScoreStep } from '../src/services/search-run';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const now = () => new Date('2026-09-27T08:00:00Z');

let test: TestDb;
let placeIds: string[];
beforeEach(async () => {
  test = await createTestDb();
  placeIds = [];
  for (const [i, [name, lat, lng]] of ([['Füssen', 47.57143, 10.70171]] as const).entries()) {
    await test.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES ($1, $2, $2, 'DE', '02', $3, $4, 9000, 'PPL', lower($2))`,
      [990500 + i, name, lat, lng],
    );
    const rows = await test.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ($1, $2, $3, 'DE', $4, $5, 'user', false) RETURNING id::text AS id`,
      [`ort-review-${i}`, name, 990500 + i, lat, lng],
    );
    placeIds.push(rows[0]?.id ?? '');
  }
});
afterEach(async () => test.close());

function deps(db: Db, overrides: Partial<ReviewRunDeps> = {}): ReviewRunDeps {
  const providers = createProviders(config, { now, fake: { llmResponders: fakeResponders }, sleep: async () => undefined });
  return {
    db,
    liteapi: providers.liteapi,
    llm: providers.llm,
    llmEnabled: true,
    llmDailyBudgetUsd: 5,
    now,
    liteapiDailyCap: 60_000,
    currency: 'EUR',
    guestNationality: 'DE',
    ...overrides,
  };
}

async function searchedAndScored(d: ReviewRunDeps): Promise<string> {
  const { id } = await createSearch(d.db as Db, {
    tokenHash: 'f'.repeat(64),
    request: {
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
  const { blocks } = await runLoad(d, id);
  for (let i = 0; i < blocks; i += 1) await runRatesBlock(d, id, i);
  await runScoreStep(d, id);
  return id;
}

const qualityOf = async (db: Db, searchId: string, hotelName: string) =>
  (
    await db.query<{ q: number }>(
      `SELECT max(o.quality_score)::float8 AS q FROM app.offers o JOIN app.hotels h ON h.id = o.hotel_id
        WHERE o.search_id = $1::uuid AND h.name = $2`,
      [searchId, hotelName],
    )
  )[0]?.q ?? null;

const schwanenId = async (db: Db) => (await db.query<{ id: string }>("SELECT id FROM app.hotels WHERE name = 'Hotel Schwanen'"))[0]?.id ?? '';

describe('review check steps (architektur.md 6.10)', () => {
  it('confirms three recent mould complaints, lowers the score in stage 2 and cleans up the snippets', async () => {
    const d = deps(test.db);
    const id = await searchedAndScored(d);
    const stage1 = await qualityOf(test.db, id, 'Hotel Schwanen');

    const fetched = await runReviewsFetch(d, id);
    expect(fetched.candidates).toBe(10);
    expect(fetched.fetched + fetched.reused).toBe(10);
    expect(fetched.pending).toBeGreaterThan(0);
    const verified = await runReviewsVerify(d, id);
    expect(verified).toEqual({ verified: fetched.pending, unverified: 0 });
    expect((await test.db.query('SELECT 1 FROM app.review_check_pending'))).toHaveLength(0);

    const [check] = await getReviewChecks(test.db, [await schwanenId(test.db)]);
    expect(check?.status).toBe('ok');
    expect(check?.skillVersion).toBe('1.0.0');
    expect(check?.topics.find((t) => t.topic === 'schimmel')).toMatchObject({ confirmed_count: 3, recent_count: 3, severity: 'high' });

    const final = await runFinalize(d, id);
    expect(final.status).toBe('done');
    expect((await getSearch(test.db, id))?.status).toBe('done');
    const stage2 = await qualityOf(test.db, id, 'Hotel Schwanen');
    expect(stage1).not.toBeNull();
    expect(stage2).toBeLessThan(stage1 as number);
    const breakdown = (
      await test.db.query<{ b: { penalty: { items: Array<{ topic: string }> }; recency: { checked: boolean } } }>(
        `SELECT o.score_breakdown AS b FROM app.offers o JOIN app.hotels h ON h.id = o.hotel_id
          WHERE o.search_id = $1::uuid AND h.name = 'Hotel Schwanen' LIMIT 1`,
        [id],
      )
    )[0]?.b;
    expect(breakdown?.recency.checked).toBe(true);
    expect(breakdown?.penalty.items.map((i) => i.topic)).toContain('schimmel');
  });

  it('reuses valid checks and skips hotels already pending when a step repeats', async () => {
    const d = deps(test.db);
    const id = await searchedAndScored(d);
    const first = await runReviewsFetch(d, id);
    const again = await runReviewsFetch(d, id);
    expect(again.fetched).toBe(0);
    expect(again.reused + again.pending).toBe(first.candidates);
    await runReviewsVerify(d, id);
    expect(await runReviewsVerify(d, id)).toEqual({ verified: 0, unverified: 0 });
  });

  it('counts hits as unverified without a penalty when the AI budget is spent', async () => {
    const d = deps(test.db, { llmDailyBudgetUsd: 0 });
    const id = await searchedAndScored(d);
    const stage1 = await qualityOf(test.db, id, 'Hotel Schwanen');
    await runReviewsFetch(d, id);
    const verified = await runReviewsVerify(d, id);
    expect(verified.verified).toBe(0);
    expect(verified.unverified).toBeGreaterThan(0);
    const [check] = await getReviewChecks(test.db, [await schwanenId(test.db)]);
    expect(check?.status).toBe('skipped_budget');
    expect(check?.skillVersion).toBeNull();
    expect(check?.topics.find((t) => t.topic === 'schimmel')).toMatchObject({ confirmed_count: 0, unverified_count: 3, severity: null });
    // Unverified checks are retried after a day instead of 30 days.
    expect(Date.parse(check?.expiresAt ?? '') - now().getTime()).toBe(24 * 3_600_000);
    await runFinalize(d, id);
    const stage2 = await qualityOf(test.db, id, 'Hotel Schwanen');
    expect(stage2).toBeGreaterThanOrEqual((stage1 as number) - 0.5);
    const penalties = await test.db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM app.offers WHERE search_id = $1::uuid AND jsonb_array_length(score_breakdown->'penalty'->'items') > 0`,
      [id],
    );
    expect(penalties[0]?.n).toBe(0);
  });

  it('falls back to unverified hints when the AI is switched off (LLM_ENABLED=false)', async () => {
    const d = deps(test.db, { llmEnabled: false });
    const id = await searchedAndScored(d);
    await runReviewsFetch(d, id);
    const verified = await runReviewsVerify(d, id);
    expect(verified.verified).toBe(0);
    const [check] = await getReviewChecks(test.db, [await schwanenId(test.db)]);
    expect(check?.status).toBe('skipped_budget');
  });

  it('fails closed without LiteAPI budget: no reviews fetched, no checks written', async () => {
    const d = deps(test.db, { liteapiDailyCap: 0 });
    const id = await searchedAndScored({ ...d, liteapiDailyCap: 60_000 });
    const fetched = await runReviewsFetch(d, id);
    expect(fetched).toMatchObject({ fetched: 0, failed: 10 });
    expect(await getReviewChecks(test.db, [await schwanenId(test.db)])).toEqual([]);
  });
});
