// SearchWorkflow steps against PGlite with the simulated LiteAPI: complete
// run, idempotent retries, 5xx → partial, deadline → partial, all failed →
// failed, and a repeated search served from the rates cache.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countOffers, createSearch, getSearch, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type FakeTuning, type ProvidersConfig } from '@reiseplaner/providers';
import { runFinalize, runLoad, runRatesBlock, type SearchRunDeps } from '../src/services/search-run';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};

let test: TestDb;
let placeIds: string[];
beforeEach(async () => {
  test = await createTestDb();
  placeIds = [];
  for (const [i, [name, lat, lng]] of ([
    ['Oberstdorf', 47.41, 10.28],
    ['Füssen', 47.57, 10.7],
  ] as const).entries()) {
    await test.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES ($1, $2, $2, 'DE', '02', $3, $4, 9000, 'PPL', lower($2))`,
      [990300 + i, name, lat, lng],
    );
    const rows = await test.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ($1, $2, $3, 'DE', $4, $5, 'user', false) RETURNING id::text AS id`,
      [`ort-${990300 + i}`, name, 990300 + i, lat, lng],
    );
    placeIds.push(rows[0]?.id ?? '');
  }
});
afterEach(async () => test.close());

const request = (ids: string[]) => ({
  origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78, lng: 9.18 },
  max_drive_minutes: 240,
  themes: [],
  window: { start: '2026-10-01', end: '2026-11-01' },
  nights: 2,
  arrival_weekdays: [5],
  occupancy: { rooms: 1, adults: 2, children_ages: [] },
  budget_total_eur: null,
  filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
  chips: [],
  place_ids: ids,
});
const fridays = ['02', '09', '16', '23', '30'].map((d) => ({ checkin: `2026-10-${d}`, checkout: `2026-10-${String(Number(d) + 2).padStart(2, '0')}` }));
fridays[4] = { checkin: '2026-10-30', checkout: '2026-11-01' };

async function newSearch(db: Db) {
  return createSearch(db, {
    tokenHash: 'e'.repeat(64),
    request: request(placeIds),
    originLat: 48.78,
    originLng: 9.18,
    ipHash: null,
    places: placeIds.map((placeId) => ({ placeId, driveMinutes: 150, source: 'user' as const })),
    dates: fridays,
  });
}

function deps(db: Db, tuning: FakeTuning = {}, now = () => new Date('2026-09-27T08:00:00Z'), calls = { n: 0 }): SearchRunDeps {
  const { liteapi } = createProviders(config, {
    onCall: (provider, endpoint) => {
      if (provider === 'liteapi' && endpoint === 'hotels/rates') calls.n += 1;
    },
    fake: tuning,
    sleep: async () => undefined,
  });
  return { db, liteapi, now, liteapiDailyCap: 60_000, currency: 'EUR', guestNationality: 'DE' };
}

async function runAll(d: SearchRunDeps, searchId: string) {
  const { blocks } = await runLoad(d, searchId);
  for (let i = 0; i < blocks; i += 1) await runRatesBlock(d, searchId, i);
  return runFinalize(d, searchId);
}

describe('search run (SearchWorkflow steps)', () => {
  it('runs every combination to done and writes offers', async () => {
    const { id } = await newSearch(test.db);
    const final = await runAll(deps(test.db), id);
    expect(final).toEqual({ status: 'done', done: 10, failed: 0 });
    expect((await getSearch(test.db, id))?.finishedAt).not.toBeNull();
    expect(await countOffers(test.db, id)).toBeGreaterThan(10);
  });

  it('a repeated step writes no duplicate offers', async () => {
    const { id } = await newSearch(test.db);
    const d = deps(test.db);
    await runLoad(d, id);
    await runRatesBlock(d, id, 0);
    const offers = await countOffers(test.db, id);
    await test.db.query("UPDATE app.search_combinations SET status = 'pending' WHERE search_id = $1::uuid", [id]);
    await runRatesBlock(d, id, 0);
    expect(await countOffers(test.db, id)).toBe(offers);
  });

  it('injected 5xx errors after retries → partial', async () => {
    const { id } = await newSearch(test.db);
    const final = await runAll(deps(test.db, { faults: [{ endpoint: 'hotels/rates', status: 500, times: 3 }] }), id);
    expect(final.status).toBe('partial');
    expect(final.failed).toBe(1);
  });

  it('an exceeded deadline → remaining combinations failed, partial', async () => {
    const { id } = await newSearch(test.db);
    let t = Date.parse('2026-09-27T08:00:00Z');
    const d = deps(test.db, {}, () => new Date(t));
    const { blocks } = await runLoad(d, id);
    expect(blocks).toBe(1);
    const search = await getSearch(test.db, id);
    t = Date.parse(search?.startedAt ?? '') + 181_000;
    const block = await runRatesBlock(d, id, 0);
    expect(block.timedOut).toBe(true);
    expect(await runFinalize(d, id)).toEqual({ status: 'failed', done: 0, failed: 10 });
  });

  it('all combinations failing → failed', async () => {
    const { id } = await newSearch(test.db);
    const final = await runAll(deps(test.db, { faults: [{ endpoint: 'hotels/rates', status: 500, times: 1_000 }] }), id);
    expect(final).toEqual({ status: 'failed', done: 0, failed: 10 });
  });

  it('a second identical search within 30 minutes causes 0 LiteAPI requests', async () => {
    const calls = { n: 0 };
    const first = await newSearch(test.db);
    await runAll(deps(test.db, {}, () => new Date('2026-09-27T08:00:00Z'), calls), first.id);
    expect(calls.n).toBe(10);
    const second = await newSearch(test.db);
    const final = await runAll(deps(test.db, {}, () => new Date('2026-09-27T08:20:00Z'), calls), second.id);
    expect(final.status).toBe('done');
    expect(calls.n).toBe(10);
    expect(await countOffers(test.db, second.id)).toBe(await countOffers(test.db, first.id));
  });
});
