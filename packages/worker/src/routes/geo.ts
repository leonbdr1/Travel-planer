// GET /api/v1/geo/localities?q= — start-location autocomplete from
// geo_localities (architektur.md 6.2 point 1); no external service.
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import { localitiesQuerySchema, type LocalitiesResponse, type LocalityDto } from '@reiseplaner/contracts';
import { searchLocalities, type Locality } from '@reiseplaner/db';
import { countryNameDe } from '@reiseplaner/domain';
import type { AppEnv } from '../app';
import { rateLimit } from '../http/rate-limit';
import { parseQuery } from '../http/validate';

const HOUR_S = 3600;
const AUTOCOMPLETE_LIMIT = 8;

export function localityDto(l: Locality): LocalityDto {
  // DACH keeps the short code ("Stuttgart, Baden-Württemberg, DE"); Europe shows the country ("Venedig, Italien").
  const dach = l.countryCode === 'DE' || l.countryCode === 'AT' || l.countryCode === 'CH' || l.admin2 === 'BZ';
  const country = dach ? l.countryCode : (countryNameDe(l.countryCode, l.admin2) ?? l.countryCode);
  return {
    geonameid: l.geonameid,
    name: l.displayName,
    label: [l.displayName, l.adminName, country].filter(Boolean).join(', '),
    admin_name: l.adminName,
    country_code: l.countryCode,
    lat: l.lat,
    lng: l.lng,
    population: l.population,
  };
}

export const geoRoutes = new Hono<AppEnv>().get(
  '/localities',
  rateLimit('lookups', productConfig.limits.rate_limits.lookups_per_hour, HOUR_S),
  async (c) => {
    const { q } = parseQuery(c, localitiesQuerySchema);
    const items = await searchLocalities(c.get('deps').db(), q, AUTOCOMPLETE_LIMIT);
    const body: LocalitiesResponse = { items: items.map(localityDto) };
    return c.json(body);
  },
);
