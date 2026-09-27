// Wizard API calls, all parsed with the shared contracts.
import {
  localitiesResponseSchema,
  placeResolveResponseSchema,
  placeSearchResponseSchema,
  placeSuggestionsResponseSchema,
  regionSuggestionsResponseSchema,
  wishParseResponseSchema,
} from '@reiseplaner/contracts';
import { apiRequest } from '../../api/client';

export function fetchLocalities(q: string, signal?: AbortSignal) {
  return apiRequest(`/geo/localities?q=${encodeURIComponent(q)}`, localitiesResponseSchema, signal ? { signal } : {});
}

export function fetchRegions(body: { origin: { geonameid: number }; max_drive_minutes: number | null; themes: string[] }) {
  return apiRequest('/suggestions/regions', regionSuggestionsResponseSchema, { body });
}

export function fetchPlaces(body: {
  origin: { geonameid: number };
  max_drive_minutes: number | null;
  themes: string[];
  region_ids: string[];
}) {
  return apiRequest('/suggestions/places', placeSuggestionsResponseSchema, { body });
}

export function searchPlaces(q: string, origin: number | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ q });
  if (origin) params.set('origin', String(origin));
  return apiRequest(`/places/search?${params}`, placeSearchResponseSchema, signal ? { signal } : {});
}

export function resolvePlace(geonameid: number, origin: number | null) {
  const params = new URLSearchParams({ geonameid: String(geonameid) });
  if (origin) params.set('origin', String(origin));
  return apiRequest(`/places/search?${params}`, placeResolveResponseSchema);
}

export function parseWish(text: string) {
  return apiRequest('/wishes/parse', wishParseResponseSchema, { body: { text } });
}
