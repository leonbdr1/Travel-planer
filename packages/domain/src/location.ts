// Location facts of a house (S11.5, architektur.md 6.15): walking minutes to
// the nearest bus stop, railway station, ski or cable-car station and
// supermarket, and restaurants close by. Points of interest come from
// OpenStreetMap through the POI port; this module only measures them.
import {
  LOCATION_GASTRO_MIN,
  LOCATION_GASTRO_RADIUS_M,
  LOCATION_MAX_WALK_MIN,
  WALK_DETOUR_FACTOR,
  WALK_METERS_PER_MIN,
} from './constants';
import { haversineKm, type LatLng } from './geo';

export const POI_KINDS = ['lift', 'bahn', 'bus', 'supermarkt', 'gastro'] as const;
export type PoiKind = (typeof POI_KINDS)[number];
export type WalkKind = Exclude<PoiKind, 'gastro'>;
export const WALK_KINDS: readonly WalkKind[] = ['lift', 'bahn', 'bus', 'supermarkt'];

export interface Poi extends LatLng {
  kind: PoiKind;
}

export interface LocationFacts {
  /** Walking minutes to the nearest one, null when none within its limit. */
  walk: Record<WalkKind, number | null>;
  /** Restaurants, cafés and bars within LOCATION_GASTRO_RADIUS_M. */
  gastro: number;
}

export const NO_LOCATION_FACTS: LocationFacts = { walk: { lift: null, bahn: null, bus: null, supermarkt: null }, gastro: 0 };

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round((meters * WALK_DETOUR_FACTOR) / WALK_METERS_PER_MIN));
}

export function locationFacts(house: LatLng, pois: readonly Poi[]): LocationFacts {
  const walk = { ...NO_LOCATION_FACTS.walk };
  let gastro = 0;
  for (const poi of pois) {
    const meters = haversineKm(house, poi) * 1000;
    if (poi.kind === 'gastro') {
      if (meters <= LOCATION_GASTRO_RADIUS_M) gastro += 1;
      continue;
    }
    const minutes = walkMinutes(meters);
    if (minutes > LOCATION_MAX_WALK_MIN[poi.kind]) continue;
    const current = walk[poi.kind];
    if (current === null || minutes < current) walk[poi.kind] = minutes;
  }
  return { walk, gastro };
}

/** Restaurants close by, enough to call the surroundings lively. */
export function hasGastroNearby(facts: LocationFacts): boolean {
  return facts.gastro >= LOCATION_GASTRO_MIN;
}
