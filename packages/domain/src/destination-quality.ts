// Quality of suggestions by distance (Aufgabe F19, docs/logik/ziel-qualitaet.md):
// the further away a destination, the better it must be, otherwise a far
// radius floods the traveller with side villages. Pure.
import {
  QUALITY_FLIGHT_MIN_SCORE,
  QUALITY_PICKY_FACTOR,
  QUALITY_PICKY_THEMES,
  QUALITY_PLACE_SLACK,
  QUALITY_STEPS,
} from './constants';
import { matchingThemes } from './themes';
import type { CatalogPlace, ReachablePlace } from './suggestions';

export type TravelMode = 'car' | 'flight';

export interface RequiredScoreInput {
  mode: TravelMode;
  /** Drive time (car) or flight time (flight). */
  minutes: number;
  /** Selected themes the place fits; empty when no theme was chosen. */
  matchedThemes: readonly string[];
}

const isPicky = (themes: readonly string[]) => themes.length > 0 && themes.every((t) => (QUALITY_PICKY_THEMES as readonly string[]).includes(t));

/** Attractiveness score (0–10) a place needs to be a hotspot for this way; 0 = every place is welcome. */
export function requiredScore({ mode, minutes, matchedThemes }: RequiredScoreInput): number {
  if (mode === 'flight') return QUALITY_FLIGHT_MIN_SCORE;
  const effective = minutes * (isPicky(matchedThemes) ? QUALITY_PICKY_FACTOR : 1);
  let need = 0;
  for (const step of QUALITY_STEPS) if (effective > step.fromMin) need = step.minScore;
  return need;
}

export type ScoredPlace = CatalogPlace & {
  /** Attractiveness score of the place (0–10); unknown → not filtered. */
  attractivenessScore?: number;
};

/**
 * Regions keep only if one of their places reaches the required score; inside
 * such a region also places up to QUALITY_PLACE_SLACK below stay, so that a
 * beach region shows its hotspot and a few lesser known neighbours.
 */
export function qualityGate<P extends ScoredPlace>(
  reachable: readonly ReachablePlace<P>[],
  selectedThemes: readonly string[],
  mode: TravelMode,
): ReachablePlace<P>[] {
  const need = (r: ReachablePlace<P>) => requiredScore({ mode, minutes: r.minutes, matchedThemes: matchingThemes(r.place.themes, selectedThemes) });
  const score = (r: ReachablePlace<P>) => r.place.attractivenessScore ?? Number.POSITIVE_INFINITY;
  const hotspotRegions = new Set(reachable.filter((r) => score(r) >= need(r)).map((r) => r.place.regionId));
  return reachable.filter((r) => hotspotRegions.has(r.place.regionId) && score(r) >= need(r) - QUALITY_PLACE_SLACK);
}

/** true when the gate excludes something for this way (then regions are ranked by quality, not by count of fitting places). */
export function gateApplies(
  reachable: readonly ReachablePlace<ScoredPlace>[],
  selectedThemes: readonly string[],
  mode: TravelMode,
): boolean {
  return mode === 'flight' || reachable.some((r) => requiredScore({ mode, minutes: r.minutes, matchedThemes: matchingThemes(r.place.themes, selectedThemes) }) > 0);
}
