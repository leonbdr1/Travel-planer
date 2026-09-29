// Region and place suggestions (architektur.md 6.2): catalog from the
// database, drive times from the cache/ORS service, ranking from the domain.
import { getLocality, getRegions, listCatalogPlaces, type CatalogPlace, type Locality, type Queryable } from '@reiseplaner/db';
import {
  candidatePlaces,
  rankPlaces,
  rankRegions,
  reachablePlaces,
  regionAttractiveness,
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
      attractiveness: regionAttractivenessDto(all.filter((p) => p.regionId === r.regionId).map((p) => p.row)),
      center: regionCenter(all.filter((p) => p.regionId === r.regionId)),
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
