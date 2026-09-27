import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usageSince, UsageRecorder } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, type ProvidersConfig } from '@reiseplaner/providers';
import { getTravelTimes, type PlacePoint } from '../src/services/travel-times';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
};
const stuttgart = { lat: 48.7823, lng: 9.177 };
const places: PlacePoint[] = [
  { id: '00000000-0000-4000-8000-000000000001', lat: 47.4099, lng: 10.2797 },
  { id: '00000000-0000-4000-8000-000000000002', lat: 47.5703, lng: 10.7003 },
];
const now = new Date('2026-09-27T08:00:00Z');

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => test.close());

describe('travel times', () => {
  it('routes missing pairs once and serves repeats from the cache', async () => {
    const usage = new UsageRecorder();
    const { routing } = createProviders(config, { onCall: (p, e) => usage.record(p, e) });
    const deps = { db: test.db, routing, providersMode: 'fake' as const, now, orsDailyCap: 450 };
    const first = await getTravelTimes(deps, stuttgart, places);
    expect(first.stats).toEqual({ cached: 0, routed: 2, estimated: 0, routingCalls: 1 });
    const oberstdorf = first.times.get(places[0]!.id)!;
    expect(oberstdorf.estimated).toBe(false);
    expect(oberstdorf.durationMin).toBeGreaterThan(120);
    await usage.flush(test.db, '2026-09-27');

    const second = await getTravelTimes(deps, { lat: 48.781, lng: 9.183 }, places);
    expect(second.stats).toEqual({ cached: 2, routed: 0, estimated: 0, routingCalls: 0 });
    await usage.flush(test.db, '2026-09-27');
    expect(await usageSince(test.db, '2026-09-27')).toEqual([{ day: '2026-09-27', provider: 'ors', endpoint: 'matrix', calls: 1 }]);
  });

  it('falls back to marked estimates when the daily quota is used up (fail-closed)', async () => {
    const { routing } = createProviders(config);
    const result = await getTravelTimes({ db: test.db, routing, providersMode: 'fake', now, orsDailyCap: 0 }, stuttgart, places);
    expect(result.stats).toMatchObject({ routed: 0, estimated: 2, routingCalls: 0 });
    expect([...result.times.values()].every((t) => t.estimated)).toBe(true);
  });

  it('falls back to estimates when the routing service reports its quota exhausted', async () => {
    const { routing } = createProviders(config, { fake: { orsQuotaExhausted: true } });
    const result = await getTravelTimes({ db: test.db, routing, providersMode: 'fake', now, orsDailyCap: 450 }, stuttgart, places);
    expect(result.stats).toMatchObject({ estimated: 2, routingCalls: 1 });
    const cachedAfter = await getTravelTimes(
      { db: test.db, routing: createProviders(config).routing, providersMode: 'fake', now, orsDailyCap: 450 },
      stuttgart,
      places,
    );
    expect(cachedAfter.stats.cached).toBe(0);
  });

  it('chunks large requests (50 destinations per matrix call)', async () => {
    const many: PlacePoint[] = Array.from({ length: 120 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      lat: 47 + i * 0.01,
      lng: 10 + i * 0.01,
    }));
    const { routing } = createProviders(config);
    const result = await getTravelTimes({ db: test.db, routing, providersMode: 'fake', now, orsDailyCap: 450 }, stuttgart, many);
    expect(result.stats).toMatchObject({ routed: 120, routingCalls: 3 });
  });
});
