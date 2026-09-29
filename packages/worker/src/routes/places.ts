// GET /api/v1/places/search?q= — own places: catalog first, then the
// locality database. `?geonameid=` resolves a locality to a place and creates
// the user place on demand (kind = user, verified = false; 6.2 point 9).
// Drive time is shown for user places but never filters them.
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import { placeSearchQuerySchema, type PlaceResolveResponse, type PlaceSearchResponse } from '@reiseplaner/contracts';
import { ensureUserPlace, getLocality, searchCatalogPlaces, searchLocalities } from '@reiseplaner/db';
import { catalogCountry } from '@reiseplaner/domain';
import type { AppEnv } from '../app';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rate-limit';
import { parseQuery } from '../http/validate';
import { driveTimeFor, placeDto, resolveOrigin } from '../services/suggestions';
import { localityDto } from './geo';
import { suggestionDeps } from './suggestions';

const HOUR_S = 3600;
const SEARCH_LIMIT = 6;

export const placeRoutes = new Hono<AppEnv>().get(
  '/search',
  rateLimit('lookups', productConfig.limits.rate_limits.lookups_per_hour, HOUR_S),
  async (c) => {
    const query = parseQuery(c, placeSearchQuerySchema);
    const deps = suggestionDeps(c);
    const visibility = { includeDrafts: deps.includeDrafts };
    const origin = query.origin ? await resolveOrigin(deps.db, query.origin) : null;

    if ('geonameid' in query) {
      const locality = await getLocality(deps.db, query.geonameid);
      if (!locality || !catalogCountry(locality.countryCode, locality.admin2)) {
        throw new ApiError(404, 'unknown_place', 'Diesen Ort kennen wir nicht.');
      }
      const place = await ensureUserPlace(deps.db, locality, visibility);
      const time = origin ? await driveTimeFor(deps, origin, place) : null;
      const body: PlaceResolveResponse = { place: placeDto(place, [], time, []) };
      return c.json(body);
    }

    const catalog = await searchCatalogPlaces(deps.db, query.q, SEARCH_LIMIT, visibility);
    const known = new Set(catalog.map((p) => p.geonameid));
    const localities = (await searchLocalities(deps.db, query.q, SEARCH_LIMIT + catalog.length)).filter(
      (l) => !known.has(l.geonameid),
    );
    const body: PlaceSearchResponse = {
      catalog: catalog.map((p) => placeDto(p, [], null, [])),
      localities: localities.slice(0, SEARCH_LIMIT).map(localityDto),
    };
    return c.json(body);
  },
);
