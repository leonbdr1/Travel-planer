// Region and place suggestions (architektur.md 6.2): catalog from the
// database, drive times from the cache/ORS service, ranking from the domain.
import { getLocality, getRegions, listCatalogPlaces, type CatalogPlace, type Locality, type Queryable } from '@reiseplaner/db';
import {
  candidatePlaces,
  rankPlaces,
  rankRegions,
  reachablePlaces,
  themeLabel,
  type CatalogPlace as DomainPlace,
  type TravelTime as DomainTravelTime,
} from '@reiseplaner/domain';
import type { PlaceDto, RegionSuggestionDto } from '@reiseplaner/contracts';
import { getTravelTimes, type TravelTimeDeps, type TravelTimeStats } from './travel-times';

export interface SuggestionDeps extends TravelTimeDeps {
  includeDrafts: boolean;
}

type Candidate = DomainPlace & { row: CatalogPlace };

export function toDomainPlace(row: CatalogPlace): Candidate {
  return {
    id: row.id,
    name: row.name,
    regionId: row.regionId ?? '',
    regionName: row.regionName ?? '',
    lat: row.lat,
    lng: row.lng,
    themes: row.themes,
    row,
  };
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
  };
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
): Promise<{ regions: RegionSuggestionDto[]; stats: ReturnType<typeof publicStats> }> {
  const all = (await listCatalogPlaces(deps.db, { includeDrafts: deps.includeDrafts })).map(toDomainPlace);
  const candidates = candidatePlaces(all, origin, selectedThemes, maxDriveMinutes);
  const { map, stats } = await times(deps, origin, candidates);
  const reachable = reachablePlaces(candidates, map, maxDriveMinutes);
  const ranked = rankRegions(reachable, selectedThemes, themeLabel);
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
    regions.push({
      id: r.regionId,
      slug: row.slug,
      name: r.name,
      description: row.descriptionDe,
      ai_assisted: row.aiAssisted,
      verified: row.verified,
      reason: r.reason,
      score: r.score,
      places: r.places,
      min_minutes: Math.round(r.minMinutes),
      max_minutes: Math.round(r.maxMinutes),
      estimated: r.estimated,
    });
  }
  return { regions, stats: publicStats(stats) };
}

export async function suggestPlaces(
  deps: SuggestionDeps,
  origin: Locality,
  maxDriveMinutes: number | null,
  selectedThemes: readonly string[],
  regionIds: readonly string[],
): Promise<{ regions: Array<{ id: string; name: string; places: PlaceDto[] }>; stats: ReturnType<typeof publicStats> }> {
  const all = (await listCatalogPlaces(deps.db, { includeDrafts: deps.includeDrafts }))
    .filter((p) => p.regionId !== null && regionIds.includes(p.regionId))
    .map(toDomainPlace);
  const candidates = candidatePlaces(all, origin, selectedThemes, maxDriveMinutes);
  const { map, stats } = await times(deps, origin, candidates);
  const reachable = reachablePlaces(candidates, map, maxDriveMinutes);
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
