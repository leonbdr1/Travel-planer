// Location facts in the finale (S11.5, architektur.md 6.15): walking minutes
// to bus stop, station, lift and supermarket, restaurants close by, from
// OpenStreetMap. Step `location-facts` runs once per search after the review
// check, only for the likely finalists of every goal, in one Overpass query;
// facts are cached per house (LOCATION_FACTS_TTL_DAYS). Without the service
// the finale simply shows no walking minutes.
import { getCacheEntries, putCacheEntry, type Queryable } from '@reiseplaner/db';
import { constants, DEFAULT_GOAL, finalistIdsAcrossGoals, locationFacts, type LocationFacts } from '@reiseplaner/domain';
import type { PoiPort, ProviderSource } from '@reiseplaner/providers';
import { z } from 'zod';
import { evaluateSearch, filtersFromRequest, loadSearchRequest, preselectHotels } from './results';
import { loadReviewData } from './reviews';
import { sha256Hex } from './search-run';

export interface LocationRunDeps {
  db: Queryable;
  poi: PoiPort;
  /** Facts are cached per source: simulated ones never show up in real operation. */
  poiSource: ProviderSource;
  now: () => Date;
}

export interface LocationFactsResult {
  houses: number;
  reused: number;
  fetched: number;
  failed: boolean;
}

const minutes = z.number().int().min(1).nullable();
const factsSchema = z.object({
  walk: z.object({ lift: minutes, bahn: minutes, bus: minutes, supermarkt: minutes, strand: minutes.default(null) }),
  gastro: z.number().int().min(0),
});

const DAY_MS = 86_400_000;
const cacheKey = (source: ProviderSource, hotelId: string) => sha256Hex(['location', source, hotelId].join('|'));

/** Cached facts per house; houses without facts are left out. */
export async function loadLocationFacts(db: Queryable, source: ProviderSource, hotelIds: readonly string[], now: Date): Promise<Map<string, LocationFacts>> {
  const keys = new Map(await Promise.all([...new Set(hotelIds)].map(async (id) => [await cacheKey(source, id), id] as const)));
  const cached = await getCacheEntries<unknown>(db, 'location_facts', [...keys.keys()], now);
  const out = new Map<string, LocationFacts>();
  for (const [key, raw] of cached) {
    const parsed = factsSchema.safeParse(raw);
    const id = keys.get(key);
    if (parsed.success && id !== undefined) out.set(id, parsed.data);
  }
  return out;
}

/** Step `location-facts`: facts for the likely finalists of every goal. */
export async function runLocationFacts(deps: LocationRunDeps, searchId: string): Promise<LocationFactsResult> {
  const now = deps.now();
  const request = await loadSearchRequest(deps.db, searchId);
  const filters = filtersFromRequest(request);
  const reviews = await loadReviewData(deps.db, searchId, filters.chips);
  const { evaluated, hotels } = await evaluateSearch(deps.db, searchId, filters, reviews);
  const ids = finalistIdsAcrossGoals({ goal: request.goal ?? DEFAULT_GOAL, evaluated, hotels: preselectHotels(hotels), evidence: reviews.evidence ?? new Map() });
  const known = await loadLocationFacts(deps.db, deps.poiSource, ids, now);
  const byId = new Map(hotels.map((h) => [h.id, h]));
  const missing = ids
    .filter((id) => !known.has(id))
    .map((id) => byId.get(id))
    .filter((h): h is NonNullable<typeof h> & { lat: number; lng: number } => h !== undefined && h.lat !== null && h.lng !== null);
  const result: LocationFactsResult = { houses: ids.length, reused: known.size, fetched: 0, failed: false };
  if (missing.length === 0) return result;
  let pois;
  try {
    pois = await deps.poi.around(
      missing.map((h) => ({ lat: h.lat, lng: h.lng })),
      constants.LOCATION_SEARCH_RADIUS_M,
      constants.LOCATION_GASTRO_RADIUS_M,
    );
  } catch (err) {
    console.error(JSON.stringify({ level: 'warn', msg: 'location facts unavailable', name: (err as Error).name }));
    return { ...result, failed: true };
  }
  const expires = new Date(now.getTime() + constants.LOCATION_FACTS_TTL_DAYS * DAY_MS);
  for (const h of missing) {
    await putCacheEntry(deps.db, 'location_facts', await cacheKey(deps.poiSource, h.id), locationFacts({ lat: h.lat, lng: h.lng }, pois), expires);
    result.fetched += 1;
  }
  return result;
}
