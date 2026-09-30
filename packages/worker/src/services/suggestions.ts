// Region and place suggestions (architektur.md 6.2): catalog from the
// database, drive times from the cache/ORS service, ranking from the domain.
import { getLocality, getRegions, listCatalogPlaces, type CatalogPlace, type Locality, type Queryable } from '@reiseplaner/db';
import {
  candidatePlaces,
  catalogCountry,
  continentOf,
  countrySelected,
  estimateFlightMinutes,
  fitsThemes,
  gateApplies,
  haversineKm,
  isFlightDistanceKm,
  qualityGate,
  rankPlaces,
  rankRegions,
  reachablePlaces,
  regionAttractiveness,
  regionTitle,
  themeLabel,
  type CatalogPlace as DomainPlace,
  type ContinentCode,
  type ScoredPlace,
  type TravelMode,
  type TravelTime as DomainTravelTime,
} from '@reiseplaner/domain';
import type { PlaceDto, RegionSuggestionDto } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { getTravelTimes, type TravelTimeDeps, type TravelTimeStats } from './travel-times';

export interface SuggestionDeps extends TravelTimeDeps {
  includeDrafts: boolean;
}

type Candidate = DomainPlace & ScoredPlace & { row: CatalogPlace };

export function toDomainPlace(row: CatalogPlace): Candidate {
  return {
    id: row.id,
    name: row.name,
    regionId: row.regionId ?? '',
    regionName: row.regionName ?? '',
    lat: row.lat,
    lng: row.lng,
    themes: row.themes,
    attractivenessScore: row.attractiveness.score,
    row,
  };
}

/**
 * How the traveller gets there (Aufgabe F19): the request's mode, continents
 * and flight limit; and where to (F20): ticked countries, none = everywhere.
 */
export interface TravelOptions {
  mode: TravelMode;
  continents: readonly ContinentCode[];
  maxFlightMinutes: number | null;
  countries: readonly string[];
}

export const CAR_ONLY: TravelOptions = { mode: 'car', continents: [], maxFlightMinutes: null, countries: [] };

/** Flight mode: places on the ticked continents (none ticked = all) that are far enough away for a flight. */
function flightCandidates(all: readonly Candidate[], origin: Locality, themes: readonly string[], continents: readonly ContinentCode[]): Candidate[] {
  const home = catalogCountry(origin.countryCode, origin.admin2);
  return all.filter((p) => {
    if (!fitsThemes(p.themes, themes)) return false;
    const continent = continentOf(catalogCountry(p.row.countryCode) ?? p.row.countryCode) ?? 'europa';
    if (continents.length > 0 && !continents.includes(continent)) return false;
    // No domestic flights: a Hamburg-Munich flight is not a holiday flight.
    if (p.row.countryCode === home) return false;
    return isFlightDistanceKm(haversineKm(origin, p));
  });
}

/** Flight times are estimates from the air distance; no routing and no cache is involved. */
function flightTimes(origin: Locality, places: readonly Candidate[]): Map<string, DomainTravelTime> {
  return new Map(places.map((p) => [p.id, { minutes: estimateFlightMinutes(origin, p), estimated: true }]));
}

/** Candidates and their travel times for a mode; the quality gate follows (F19). */
async function reachableFor(
  deps: SuggestionDeps,
  origin: Locality,
  all: readonly Candidate[],
  maxDriveMinutes: number | null,
  themes: readonly string[],
  travel: TravelOptions,
) {
  // Whoever names a country is not after "the best of Europe": only that country counts.
  const pool = travel.countries.length > 0 ? all.filter((p) => countrySelected(p.row.countryCode, travel.countries)) : all;
  if (travel.mode === 'flight') {
    const candidates = flightCandidates(pool, origin, themes, travel.continents);
    const reachable = reachablePlaces(candidates, flightTimes(origin, candidates), travel.maxFlightMinutes);
    return { reachable, stats: { cached: 0, routed: 0, estimated: 0, coarse: 0, routingCalls: 0 } satisfies TravelTimeStats };
  }
  const candidates = candidatePlaces(pool, origin, themes, maxDriveMinutes);
  const { map, stats } = await times(deps, origin, candidates);
  return { reachable: reachablePlaces(candidates, map, maxDriveMinutes), stats };
}

export function placeDto(
  row: CatalogPlace,
  selectedThemes: readonly string[],
  time: { minutes: number; estimated: boolean } | null,
  matched: readonly string[],
): PlaceDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    geonameid: row.geonameid,
    region_id: row.regionId,
    region_name: row.regionName,
    country_code: row.countryCode,
    description: row.descriptionDe,
    ai_assisted: row.aiAssisted,
    verified: row.verified,
    themes: Object.entries(row.themes)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([code, strength]) => ({ code, label: themeLabel(code), strength })),
    matched_themes: [...matched].filter((t) => selectedThemes.includes(t)),
    minutes: time ? Math.round(time.minutes) : null,
    estimated: time?.estimated ?? false,
    attractiveness: row.attractiveness,
  };
}

/** Mean position of a region's places (Aufgabe 13); null without places. */
function regionCenter(places: readonly { lat: number; lng: number }[]): RegionSuggestionDto['center'] {
  if (places.length === 0) return null;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { lat: round(places.reduce((s, p) => s + p.lat, 0) / places.length), lng: round(places.reduce((s, p) => s + p.lng, 0) / places.length) };
}

/** A region by its best places (Aufgabe 8): score and level, and the names of those places. */
function regionAttractivenessDto(rows: readonly CatalogPlace[]): RegionSuggestionDto['attractiveness'] {
  const best = [...rows].sort((a, b) => b.attractiveness.score - a.attractiveness.score).slice(0, 3);
  const region = regionAttractiveness(best.map((p) => p.attractiveness.score));
  return region ? { ...region, top_places: best.map((p) => p.name) } : null;
}

export async function resolveOrigin(db: Queryable, geonameid: number): Promise<Locality | null> {
  return getLocality(db, geonameid);
}

async function times(deps: SuggestionDeps, origin: Locality, places: readonly Candidate[]) {
  const { times: map, stats } = await getTravelTimes(deps, origin, places);
  const out = new Map<string, DomainTravelTime>();
  for (const [id, t] of map) out.set(id, { minutes: t.durationMin, estimated: t.estimated });
  return { map: out, stats };
}

const publicStats = (s: TravelTimeStats) => ({ cached: s.cached, routed: s.routed, estimated: s.estimated });

export async function suggestRegions(
  deps: SuggestionDeps,
  origin: Locality,
  maxDriveMinutes: number | null,
  selectedThemes: readonly string[],
  travel: TravelOptions = CAR_ONLY,
): Promise<{ regions: RegionSuggestionDto[]; stats: ReturnType<typeof publicStats>; qualityFilter: boolean }> {
  const all = (await listCatalogPlaces(deps.db, { includeDrafts: deps.includeDrafts })).map(toDomainPlace);
  const { reachable: inRange, stats } = await reachableFor(deps, origin, all, maxDriveMinutes, selectedThemes, travel);
  // The further away, the better the places must be (F19); close by everything fitting stays.
  // With a named country (F20) the traveller has narrowed it down: no minimum, the best places first.
  const picked = travel.countries.length > 0;
  const strict = !picked && gateApplies(inRange, selectedThemes, travel.mode);
  const reachable = picked ? inRange : qualityGate(inRange, selectedThemes, travel.mode);
  const ranked = rankRegions(
    reachable,
    selectedThemes,
    themeLabel,
    strict ? constants.SUGGEST_MAX_REGIONS_FAR : constants.SUGGEST_MAX_REGIONS_NEAR,
    strict || picked ? 'quality' : 'themes',
    travel.mode,
  );
  const regionRows = await getRegions(
    deps.db,
    ranked.map((r) => r.regionId),
    { includeDrafts: deps.includeDrafts },
  );
  const byId = new Map(regionRows.map((r) => [r.id, r]));
  const regions: RegionSuggestionDto[] = [];
  for (const r of ranked) {
    const row = byId.get(r.regionId);
    if (!row) continue;
    const regionPlaces = all.filter((p) => p.regionId === r.regionId);
    // Highlights among the places that fit this search (a beach search names no mountain village).
    const matching = reachable.filter((x) => x.place.regionId === r.regionId).map((x) => x.place);
    const { title, highlight } = regionTitle(r.name, matching.map((p) => ({ name: p.name, level: p.row.attractiveness.level })));
    const regionScore = regionAttractivenessDto(regionPlaces.map((p) => p.row));
    // A card named after its highlight shows that place's level ("Bozen · Top-Urlaubsort"), not the region mean.
    const highlightRow = highlight ? matching.find((p) => p.name === highlight)?.row : undefined;
    const attractiveness =
      regionScore && highlightRow ? { ...regionScore, score: highlightRow.attractiveness.score, level: highlightRow.attractiveness.level } : regionScore;
    regions.push({
      id: r.regionId,
      slug: row.slug,
      name: r.name,
      title,
      highlight_place: highlight,
      description: row.descriptionDe,
      ai_assisted: row.aiAssisted,
      verified: row.verified,
      reason: r.reason,
      score: r.score,
      places: r.places,
      min_minutes: Math.round(r.minMinutes),
      max_minutes: Math.round(r.maxMinutes),
      estimated: r.estimated,
      attractiveness,
      center: regionCenter(regionPlaces),
    });
  }
  return { regions, stats: publicStats(stats), qualityFilter: strict && reachable.length < inRange.length };
}

export async function suggestPlaces(
  deps: SuggestionDeps,
  origin: Locality,
  maxDriveMinutes: number | null,
  selectedThemes: readonly string[],
  regionIds: readonly string[],
  travel: TravelOptions = CAR_ONLY,
): Promise<{ regions: Array<{ id: string; name: string; places: PlaceDto[] }>; stats: ReturnType<typeof publicStats> }> {
  const all = (await listCatalogPlaces(deps.db, { includeDrafts: deps.includeDrafts }))
    .filter((p) => p.regionId !== null && regionIds.includes(p.regionId))
    .map(toDomainPlace);
  const { reachable: inRange, stats } = await reachableFor(deps, origin, all, maxDriveMinutes, selectedThemes, travel);
  const reachable = travel.countries.length > 0 ? inRange : qualityGate(inRange, selectedThemes, travel.mode);
  const regions = regionIds
    .map((id) => {
      const ranked = rankPlaces(
        reachable.filter((r) => r.place.regionId === id),
        selectedThemes,
      );
      const name = ranked[0]?.place.regionName ?? all.find((p) => p.regionId === id)?.regionName ?? '';
      return {
        id,
        name,
        places: ranked.map((r) => placeDto(r.place.row, selectedThemes, r, r.matchedThemes)),
      };
    })
    .filter((r) => r.name !== '');
  return { regions, stats: publicStats(stats) };
}

/** Drive time for a single place (user places: shown, never filtered; 6.2 point 9). */
export async function driveTimeFor(deps: SuggestionDeps, origin: Locality, row: CatalogPlace) {
  const { map } = await times(deps, origin, [toDomainPlace(row)]);
  return map.get(row.id) ?? null;
}
