// Simulated Overpass API: for every house in the query a deterministic set of
// bus stops, stations, lift stations, supermarkets, beaches (as outlines) and restaurants around it,
// so the finale shows walking minutes without network access.
import type { FetchLike } from '../http/request';
import { between, intBetween, seeded } from './random';

const METERS_PER_DEG_LAT = 111_195;

/** Kind, OSM tags, chance that one exists near a house, distance range (m). */
const KINDS = [
  { tags: { highway: 'bus_stop' }, chance: 0.8, min: 60, max: 900 },
  { tags: { railway: 'station' }, chance: 0.3, min: 300, max: 1400 },
  { tags: { aerialway: 'station' }, chance: 0.35, min: 100, max: 1400 },
  { tags: { shop: 'supermarket' }, chance: 0.7, min: 150, max: 1100 },
] as const;

function offset(lat: number, lng: number, meters: number, angle: number) {
  const dLat = (meters * Math.cos(angle)) / METERS_PER_DEG_LAT;
  const dLng = (meters * Math.sin(angle)) / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lon: lng + dLng };
}

type FakeElement =
  | { type: 'node'; lat: number; lon: number; tags: Record<string, string> }
  | { type: 'way'; geometry: Array<{ lat: number; lon: number }>; tags: Record<string, string> };

/** A beach is an outline of five points, 60 m apart, at some distance from the house (Aufgabe F20). */
function fakeBeach(lat: number, lng: number, key: string): FakeElement | null {
  const r = seeded('poi', key, 'beach');
  if (r() > 0.3) return null;
  const angle = between(r, 0, 2 * Math.PI);
  const start = offset(lat, lng, between(r, 80, 1000), angle);
  const geometry = Array.from({ length: 5 }, (_, i) => offset(start.lat, start.lon, 60 * i, angle + Math.PI / 2));
  return { type: 'way', geometry, tags: { natural: 'beach' } };
}

export function fakePoisAround(lat: number, lng: number): FakeElement[] {
  const key = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
  const out: FakeElement[] = [];
  const beach = fakeBeach(lat, lng, key);
  if (beach) out.push(beach);
  for (const kind of KINDS) {
    const r = seeded('poi', key, Object.values(kind.tags).join());
    if (r() > kind.chance) continue;
    out.push({ type: 'node', ...offset(lat, lng, between(r, kind.min, kind.max), between(r, 0, 2 * Math.PI)), tags: { ...kind.tags } });
  }
  const g = seeded('poi', key, 'gastro');
  const restaurants = intBetween(g, 0, 7);
  for (let i = 0; i < restaurants; i += 1) {
    out.push({ type: 'node', ...offset(lat, lng, between(g, 30, 450), between(g, 0, 2 * Math.PI)), tags: { amenity: i % 3 === 0 ? 'cafe' : 'restaurant' } });
  }
  return out;
}

export function createFakeOverpassFetch(): FetchLike {
  return async (_input, init) => {
    const query = decodeURIComponent(String(init?.body ?? '').replace(/^data=/, ''));
    const houses = new Set<string>();
    for (const m of query.matchAll(/around:\d+,(-?[\d.]+),(-?[\d.]+)\)/g)) houses.add(`${m[1]},${m[2]}`);
    const elements = [...houses].flatMap((h) => {
      const [lat, lng] = h.split(',').map(Number) as [number, number];
      return fakePoisAround(lat, lng);
    });
    return new Response(JSON.stringify({ elements }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
