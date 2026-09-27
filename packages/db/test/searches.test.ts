import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NormalizedOffer } from '@reiseplaner/domain';
import {
  combinationBlock,
  countOffers,
  createSearch,
  failPendingCombinations,
  getCacheEntry,
  getSearch,
  markCombination,
  markSearchRunning,
  progressCells,
  putCacheEntry,
  recountSearch,
  upsertHotels,
  upsertOffers,
} from '../src/repos/searches';
import { createTestDb, type TestDb } from '../src/testing';

let t: TestDb;
const placeIds: string[] = [];
beforeAll(async () => {
  t = await createTestDb();
  for (const [i, name] of ['Adorf', 'Bedorf'].entries()) {
    await t.db.query(
      `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
       VALUES ($1, $2, $2, 'DE', '02', 47.5, 10.5, 1000, 'PPL', lower($2))`,
      [990200 + i, name],
    );
    const rows = await t.db.query<{ id: string }>(
      `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
       VALUES ($1, $2, $3, 'DE', 47.5, 10.5, 'user', false) RETURNING id::text AS id`,
      [`ort-${990200 + i}`, name, 990200 + i],
    );
    placeIds.push(rows[0]?.id ?? '');
  }
}, 60_000);
afterAll(async () => t.close());

const offer = (hotelId: string, totalCents: number): NormalizedOffer => ({
  hotelId,
  kind: 'cheapest',
  offerId: `o-${hotelId}-${totalCents}`,
  roomName: 'Doppelzimmer',
  boardType: 'BB',
  refundable: true,
  freeCancelUntil: '2026-10-01T22:00:00Z',
  totalCents,
  payAtPropertyCents: 0,
  payAtPropertyKnown: true,
  currency: 'EUR',
  nights: 2,
  pricePerNightCents: totalCents / 2,
});

describe('search repositories', () => {
  it('creates places × dates combinations, writes offers idempotently and counts progress', async () => {
    const { id, combos } = await createSearch(t.db, {
      tokenHash: 'a'.repeat(64),
      request: { nights: 2 },
      originLat: 48.78,
      originLng: 9.18,
      ipHash: null,
      places: placeIds.map((placeId) => ({ placeId, driveMinutes: 100, source: 'user' as const })),
      dates: [
        { checkin: '2026-10-02', checkout: '2026-10-04' },
        { checkin: '2026-10-09', checkout: '2026-10-11' },
        { checkin: '2026-10-16', checkout: '2026-10-18' },
      ],
    });
    expect(combos).toBe(6);
    expect((await getSearch(t.db, id))?.status).toBe('queued');
    const started = await markSearchRunning(t.db, id);
    expect(started).toMatch(/Z$/);
    expect(await markSearchRunning(t.db, id)).toBe(started);

    const block0 = await combinationBlock(t.db, id, 0, 4);
    const block1 = await combinationBlock(t.db, id, 1, 4);
    expect(block0.map((c) => c.checkin)).toEqual(['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-02']);
    expect(block1).toHaveLength(2);

    await upsertHotels(t.db, [
      { id: 'h1', name: 'Haus Eins', address: null, city: null, countryCode: 'DE', lat: 47.5, lng: 10.5, stars: 3, rating: 8.6, reviewCount: 120, hotelType: 'Hotel', mainPhotoUrl: null, facilityIds: [1, 2] },
    ]);
    const first = block0[0];
    if (!first) throw new Error('no combination');
    await upsertOffers(t.db, id, first.id, [offer('h1', 21_200)]);
    await upsertOffers(t.db, id, first.id, [offer('h1', 19_900)]);
    expect(await countOffers(t.db, id)).toBe(1);
    await markCombination(t.db, first.id, 'done', 1);
    await markCombination(t.db, block0[1]?.id ?? 0, 'cached', 0);
    await markCombination(t.db, block0[2]?.id ?? 0, 'failed', 0, 'rate_limited');
    expect(await recountSearch(t.db, id)).toEqual({ done: 2, failed: 1, total: 6 });
    expect(await failPendingCombinations(t.db, id, 'timeout')).toBe(3);
    expect(await recountSearch(t.db, id)).toEqual({ done: 2, failed: 4, total: 6 });
    const cells = await progressCells(t.db, id);
    expect(cells[0]).toMatchObject({ status: 'done', offersCount: 1, minTotalCents: 19_900 });
  });

  it('serves cache entries until they expire', async () => {
    const key = 'b'.repeat(64);
    await putCacheEntry(t.db, 'rates', key, { offers: 3 }, new Date('2026-09-27T12:30:00Z'));
    expect(await getCacheEntry(t.db, 'rates', key, new Date('2026-09-27T12:00:00Z'))).toEqual({ offers: 3 });
    expect(await getCacheEntry(t.db, 'rates', key, new Date('2026-09-27T12:31:00Z'))).toBeNull();
  });
});
