// Drive times from a start location to catalog places (architektur.md 6.2
// steps 2, 5, 11): cache per origin cell, routing only for missing pairs in
// chunks, minute and daily quota (fail-closed), straight-line estimate as
// the clearly marked fallback.
import {
  budgetReserve,
  budgetSettle,
  getCachedTravelTimes,
  incrementRateLimit,
  upsertTravelTimes,
  type Queryable,
} from '@reiseplaner/db';
import { constants, estimateDrive, originCell, type LatLng } from '@reiseplaner/domain';
import type { ProviderSource, RoutingPort } from '@reiseplaner/providers';

export interface PlacePoint extends LatLng {
  id: string;
}

export interface TravelTime {
  durationMin: number;
  distanceKm: number;
  /** true: straight-line estimate (routing unavailable or quota used up). */
  estimated: boolean;
}

export interface TravelTimeDeps {
  db: Queryable;
  routing: RoutingPort;
  /** Source of `routing`; cached drive times are only reused from the same source. */
  routingSource: ProviderSource;
  now: Date;
  orsDailyCap: number;
}

export interface TravelTimeStats {
  cached: number;
  routed: number;
  estimated: number;
  routingCalls: number;
}

export async function getTravelTimes(
  deps: TravelTimeDeps,
  origin: LatLng,
  places: readonly PlacePoint[],
): Promise<{ times: Map<string, TravelTime>; stats: TravelTimeStats }> {
  const cell = originCell(origin);
  const provider = deps.routingSource === 'fake' ? 'fake' : 'ors';
  const stats: TravelTimeStats = { cached: 0, routed: 0, estimated: 0, routingCalls: 0 };
  const times = new Map<string, TravelTime>();
  const ttlStart = new Date(deps.now.getTime() - constants.TRAVEL_TIME_CACHE_TTL_DAYS * 86_400_000);
  const cached = await getCachedTravelTimes(
    deps.db,
    cell.key,
    places.map((p) => p.id),
    ttlStart,
    provider,
  );
  for (const [placeId, row] of cached) {
    times.set(placeId, { durationMin: row.durationMin, distanceKm: row.distanceKm, estimated: false });
    stats.cached += 1;
  }

  const missing = places.filter((p) => !times.has(p.id));
  for (let i = 0; i < missing.length; i += constants.ORS_MATRIX_CHUNK) {
    const chunk = missing.slice(i, i + constants.ORS_MATRIX_CHUNK);
    let results: Array<{ durationMin: number; distanceKm: number } | null> | null = null;
    const minute = await incrementRateLimit(deps.db, 'ors:minute', constants.ORS_PER_MIN_CAP, 60);
    if (minute.allowed && (await budgetReserve(deps.db, 'ors_calls', 1, deps.orsDailyCap))) {
      stats.routingCalls += 1;
      try {
        results = await deps.routing.matrix({ lat: cell.lat, lng: cell.lng }, chunk);
      } catch {
        results = null;
      } finally {
        await budgetSettle(deps.db, 'ors_calls', 1, 1).catch(() => {});
      }
    }
    const fresh: Array<{ placeId: string; durationMin: number; distanceKm: number; provider: 'ors' | 'fake' }> = [];
    chunk.forEach((place, index) => {
      const routed = results?.[index];
      if (routed) {
        times.set(place.id, { ...routed, estimated: false });
        fresh.push({ placeId: place.id, ...routed, provider });
        stats.routed += 1;
      } else {
        times.set(place.id, { ...estimateDrive(origin, place), estimated: true });
        stats.estimated += 1;
      }
    });
    if (fresh.length) await upsertTravelTimes(deps.db, cell.key, fresh);
  }
  return { times, stats };
}
