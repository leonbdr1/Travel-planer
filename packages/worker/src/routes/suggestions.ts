// POST /api/v1/suggestions/regions and /suggestions/places (architektur.md
// 6.2, F2 and F3): catalog candidates, drive times (cache → ORS → estimate),
// ranking and reasons.
import { Hono, type Context } from 'hono';
import { productConfig } from '@reiseplaner/config';
import {
  placeSuggestionsRequestSchema,
  regionSuggestionsRequestSchema,
  type PlaceSuggestionsResponse,
  type RegionSuggestionsResponse,
} from '@reiseplaner/contracts';
import type { AppEnv } from '../app';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rate-limit';
import { parseJsonBody } from '../http/validate';
import { resolveOrigin, suggestPlaces, suggestRegions, type SuggestionDeps, type TravelOptions } from '../services/suggestions';

const HOUR_S = 3600;

export function suggestionDeps(c: Context<AppEnv>): SuggestionDeps {
  const deps = c.get('deps');
  return {
    db: deps.db(),
    routing: deps.providers().routing,
    routingSource: deps.providers().sources.routing,
    now: deps.now(),
    orsDailyCap: productConfig.limits.daily_quotas.ors_calls,
    includeDrafts: deps.config.CATALOG_ALLOW_DRAFTS,
  };
}

async function originOrThrow(c: Context<AppEnv>, geonameid: number) {
  const origin = await resolveOrigin(c.get('deps').db(), geonameid);
  if (!origin) throw new ApiError(404, 'unknown_origin', 'Diesen Startort kennen wir nicht. Bitte wähle ihn aus der Liste.');
  return origin;
}

const travelOptions = (req: { travel_mode: 'car' | 'flight'; continents: TravelOptions['continents']; max_flight_minutes: number | null }): TravelOptions => ({
  mode: req.travel_mode,
  continents: req.continents,
  maxFlightMinutes: req.max_flight_minutes,
});

const originDto = (o: { geonameid: number; displayName: string; lat: number; lng: number }) => ({
  geonameid: o.geonameid,
  label: o.displayName,
  lat: o.lat,
  lng: o.lng,
});

export const suggestionRoutes = new Hono<AppEnv>()
  .use('*', rateLimit('lookups', productConfig.limits.rate_limits.lookups_per_hour, HOUR_S))
  .post('/regions', async (c) => {
    const req = await parseJsonBody(c, regionSuggestionsRequestSchema);
    const origin = await originOrThrow(c, req.origin.geonameid);
    const { regions, stats, qualityFilter } = await suggestRegions(suggestionDeps(c), origin, req.max_drive_minutes, req.themes, travelOptions(req));
    const body: RegionSuggestionsResponse = { origin: originDto(origin), regions, travel_times: stats, quality_filter: qualityFilter };
    return c.json(body);
  })
  .post('/places', async (c) => {
    const req = await parseJsonBody(c, placeSuggestionsRequestSchema);
    const origin = await originOrThrow(c, req.origin.geonameid);
    const { regions, stats } = await suggestPlaces(suggestionDeps(c), origin, req.max_drive_minutes, req.themes, req.region_ids, travelOptions(req));
    const body: PlaceSuggestionsResponse = { regions, travel_times: stats };
    return c.json(body);
  });
