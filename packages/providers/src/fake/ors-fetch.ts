// Simulated openrouteservice matrix: road distance ≈ straight line × a
// deterministic detour factor, speed depends on the distance (country roads
// vs. motorway). Good enough to make suggestions and filters behave.
import { haversineKm } from '@reiseplaner/domain';
import type { FetchLike } from '../http/request';
import { between, seeded } from './random';

export interface FakeOrsOptions {
  /** Answer with HTTP 403 (daily quota exhausted) – tests of the fallback. */
  quotaExhausted?: boolean;
}

export function fakeDrive(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const straight = haversineKm(from, to);
  const detour = between(seeded('detour', from.lat.toFixed(3), from.lng.toFixed(3), to.lat.toFixed(3), to.lng.toFixed(3)), 1.18, 1.38);
  const km = straight * detour;
  const speed = km < 30 ? 55 : km < 100 ? 72 : 88;
  return { seconds: Math.round((km / speed) * 3600 + 240), km: Math.round(km * 10) / 10 };
}

export function createFakeOrsFetch(options: FakeOrsOptions = {}): FetchLike {
  return async (_input, init) => {
    if (options.quotaExhausted) {
      return new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 403 });
    }
    const body = JSON.parse(String(init?.body ?? '{}')) as { locations: Array<[number, number]>; destinations: number[] };
    const [originLng, originLat] = body.locations[0] ?? [0, 0];
    const origin = { lat: originLat, lng: originLng };
    const results = body.destinations.map((index) => {
      const [lng, lat] = body.locations[index] ?? [0, 0];
      return fakeDrive(origin, { lat, lng });
    });
    return new Response(
      JSON.stringify({ durations: [results.map((r) => r.seconds)], distances: [results.map((r) => r.km)] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
}
