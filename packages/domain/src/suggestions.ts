// Region and place suggestions (architektur.md 6.2 points 3–8, 10, 11). Pure:
// the caller supplies catalog places and travel times.
import { SUGGEST_MAX_PLACES_PER_REGION, SUGGEST_MAX_REGIONS, SUGGEST_MIN_REGIONS } from './constants';
import { withinPrefilter, type LatLng } from './geo';
import { regionReason } from './texts';
import { fitsThemes, matchingThemes, themeScore, type PlaceThemes } from './themes';

export interface CatalogPlace extends LatLng {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  themes: PlaceThemes;
}

export interface TravelTime {
  minutes: number;
  estimated: boolean;
}

export interface ReachablePlace<P extends CatalogPlace = CatalogPlace> {
  place: P;
  minutes: number;
  estimated: boolean;
}

export interface RegionSuggestion {
  regionId: string;
  name: string;
  score: number;
  places: number;
  minMinutes: number;
  maxMinutes: number;
  estimated: boolean;
  reason: string;
}

/** Steps 3 and 4: theme candidates within the straight-line prefilter. */
export function candidatePlaces<P extends CatalogPlace>(
  places: readonly P[],
  origin: LatLng,
  selectedThemes: readonly string[],
  maxDriveMinutes: number | null,
): P[] {
  return places.filter(
    (p) => fitsThemes(p.themes, selectedThemes) && (maxDriveMinutes === null || withinPrefilter(origin, p, maxDriveMinutes)),
  );
}

/** Step 5: travel times known → filter by the maximum drive time (none → keep all). */
export function reachablePlaces<P extends CatalogPlace>(
  candidates: readonly P[],
  times: ReadonlyMap<string, TravelTime>,
  maxDriveMinutes: number | null,
): ReachablePlace<P>[] {
  const out: ReachablePlace<P>[] = [];
  for (const place of candidates) {
    const t = times.get(place.id);
    if (!t) continue;
    if (maxDriveMinutes !== null && t.minutes > maxDriveMinutes) continue;
    out.push({ place, minutes: t.minutes, estimated: t.estimated });
  }
  return out;
}

/** Steps 6 and 7: regions ranked by Σ strength of the selected themes over reachable places. */
export function rankRegions(
  reachable: readonly ReachablePlace[],
  selectedThemes: readonly string[],
  themeLabel: (code: string) => string,
  maxRegions: number = SUGGEST_MAX_REGIONS,
): RegionSuggestion[] {
  const byRegion = new Map<string, ReachablePlace[]>();
  for (const r of reachable) byRegion.set(r.place.regionId, [...(byRegion.get(r.place.regionId) ?? []), r]);
  const suggestions: RegionSuggestion[] = [];
  for (const [regionId, list] of byRegion) {
    const first = list[0];
    if (!first) continue;
    const minutes = list.map((r) => r.minutes);
    const matched = new Set(list.flatMap((r) => matchingThemes(r.place.themes, selectedThemes)));
    const labels = selectedThemes.filter((t) => matched.has(t)).map(themeLabel);
    const estimated = list.some((r) => r.estimated);
    const minMinutes = Math.min(...minutes);
    const maxMinutes = Math.max(...minutes);
    suggestions.push({
      regionId,
      name: first.place.regionName,
      score: list.reduce((s, r) => s + themeScore(r.place.themes, selectedThemes), 0),
      places: list.length,
      minMinutes,
      maxMinutes,
      estimated,
      reason: regionReason({ places: list.length, themeLabels: labels, minMinutes, maxMinutes, estimated }),
    });
  }
  suggestions.sort((a, b) => b.score - a.score || a.minMinutes - b.minMinutes || a.name.localeCompare(b.name, 'de'));
  return suggestions.slice(0, Math.max(SUGGEST_MIN_REGIONS, maxRegions));
}

/** Step 8: places of one region by theme score, then drive time. */
export function rankPlaces<P extends CatalogPlace>(
  reachable: readonly ReachablePlace<P>[],
  selectedThemes: readonly string[],
  maxPlaces: number = SUGGEST_MAX_PLACES_PER_REGION,
): Array<ReachablePlace<P> & { score: number; matchedThemes: string[] }> {
  return reachable
    .map((r) => ({ ...r, score: themeScore(r.place.themes, selectedThemes), matchedThemes: matchingThemes(r.place.themes, selectedThemes) }))
    .sort((a, b) => b.score - a.score || a.minutes - b.minutes || a.place.name.localeCompare(b.place.name, 'de'))
    .slice(0, maxPlaces);
}

/**
 * Places ticked in advance in step 3: round by round the next best place of
 * every region, until `limit`. A region with few places leaves its slots to
 * the others (Ben's test, 2026-09-28: 7 of 10 were ticked and Oberstaufen was
 * missing, because every region got the same share).
 */
export function preselectPlaceIds(regions: ReadonlyArray<{ places: ReadonlyArray<{ id: string }> }>, limit: number): string[] {
  const picked: string[] = [];
  for (let round = 0; picked.length < limit; round += 1) {
    let added = false;
    for (const region of regions) {
      const place = region.places[round];
      if (!place || picked.length >= limit) continue;
      added = true;
      if (!picked.includes(place.id)) picked.push(place.id);
    }
    if (!added) break;
  }
  return picked;
}

/** How many places may be ticked in advance: `maxPlaces`, and no more than the combinations allow for the dates. */
export function placeLimit(maxPlaces: number, maxCombinations: number, dateCount: number): number {
  return dateCount > 0 ? Math.max(1, Math.min(maxPlaces, Math.floor(maxCombinations / dateCount))) : maxPlaces;
}
