// Geography helpers (architektur.md 6.2): great-circle distance, origin
// cells for the travel-time cache and the straight-line fallback estimate.
import { ESTIMATE_AVG_SPEED_KMH, ESTIMATE_ROAD_FACTOR, ORIGIN_CELL_DEG, PREFILTER_KM_PER_MIN } from './constants';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rounds to the origin grid (≈2 km) and formats as `"48.78:9.18"`. */
export function originCell(point: LatLng, cellDeg: number = ORIGIN_CELL_DEG): { key: string; lat: number; lng: number } {
  const snap = (v: number) => Math.round(Math.round(v / cellDeg) * cellDeg * 100) / 100;
  const lat = snap(point.lat);
  const lng = snap(point.lng);
  return { key: `${lat.toFixed(2)}:${lng.toFixed(2)}`, lat, lng };
}

/** Straight-line prefilter: is the place possibly reachable within `maxMinutes`? */
export function withinPrefilter(origin: LatLng, place: LatLng, maxMinutes: number, kmPerMin: number = PREFILTER_KM_PER_MIN): boolean {
  return haversineKm(origin, place) <= maxMinutes * kmPerMin;
}

/**
 * Fallback when the routing service is unavailable or its quota is used up:
 * straight line × road factor at an average speed (clearly labelled as an
 * estimate in the UI, architektur.md 6.2 point 11).
 */
export function estimateDrive(
  origin: LatLng,
  place: LatLng,
  roadFactor: number = ESTIMATE_ROAD_FACTOR,
  speedKmh: number = ESTIMATE_AVG_SPEED_KMH,
): { durationMin: number; distanceKm: number } {
  const distanceKm = haversineKm(origin, place) * roadFactor;
  return { durationMin: Math.round((distanceKm / speedKmh) * 60), distanceKm: Math.round(distanceKm * 10) / 10 };
}
