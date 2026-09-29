// Tripadvisor Content API adapter behind RatingSourcePort. Two calls per
// lookup: nearby_search (hotels around the coordinates) and, for the one
// candidate that matches by name, location details (rating 0–5, review count).
// A wrong match is worse than none: without a clear name match and a nearby
// position the answer is `not_found`.
import { z } from 'zod';
import { requestJson, type FetchLike } from '../http/request';
import { ProviderError } from '../http/errors';
import type { RatingLookup, RatingLookupResult, RatingSourcePort } from './port';

export const TRIPADVISOR_SOURCE = 'Tripadvisor';
export const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';
/** API calls one lookup can use (search plus details); the budget reserves them. */
export const TRIPADVISOR_CALLS_PER_LOOKUP = 2;

const SEARCH_RADIUS_KM = 0.5;
const MAX_DISTANCE_M = 400;
const MIN_NAME_SIMILARITY = 0.6;

const nearbySchema = z.object({
  data: z.array(z.object({ location_id: z.union([z.string(), z.number()]), name: z.string() })).default([]),
});

const detailsSchema = z.object({
  name: z.string().optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  num_reviews: z.union([z.string(), z.number()]).optional(),
  web_url: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

export interface TripadvisorOptions {
  apiKey: string | undefined;
  baseUrl?: string;
  fetch: FetchLike;
  timeoutMs?: number;
  onCall?: (endpoint: string) => void;
}

const GENERIC_WORDS = new Set(['hotel', 'gasthof', 'gasthaus', 'pension', 'landhotel', 'ferienwohnung', 'apartment', 'apartments', 'und', 'and', 'the', 'der', 'die', 'das', 'zum', 'zur', 'am', 'im']);

export function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !GENERIC_WORDS.has(t));
}

export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / Math.max(ta.size, tb.size);
}

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function createTripadvisorRatingSource(options: TripadvisorOptions): RatingSourcePort {
  const base = options.baseUrl ?? TRIPADVISOR_BASE_URL;
  const call = <S extends z.ZodType>(endpoint: string, path: string, params: Record<string, string>, schema: S) =>
    requestJson({
      provider: 'tripadvisor',
      endpoint,
      url: `${base}${path}?${new URLSearchParams({ ...params, key: options.apiKey ?? '' }).toString()}`,
      schema,
      fetch: options.fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
      // Every attempt is billed; no retries.
      maxRetries: 0,
      ...(options.onCall ? { onAttempt: options.onCall } : {}),
    });

  return {
    configured: Boolean(options.apiKey),
    callsPerLookup: TRIPADVISOR_CALLS_PER_LOOKUP,
    async lookup(request: RatingLookup): Promise<RatingLookupResult> {
      if (!options.apiKey) throw new ProviderError('tripadvisor', 'not_configured', 'TRIPADVISOR_API_KEY is not set');
      if (request.lat === null || request.lng === null) return { status: 'unavailable', reason: 'not_found' };
      const nearby = await call(
        'nearby_search',
        '/location/nearby_search',
        { latLong: `${request.lat},${request.lng}`, category: 'hotels', radius: String(SEARCH_RADIUS_KM), radiusUnit: 'km', language: 'de' },
        nearbySchema,
      );
      let best: { id: string; score: number } | undefined;
      for (const candidate of nearby.data) {
        const score = nameSimilarity(request.name, candidate.name);
        if (score >= MIN_NAME_SIMILARITY && (!best || score > best.score)) best = { id: String(candidate.location_id), score };
      }
      if (!best) return { status: 'unavailable', reason: 'not_found' };

      const details = await call('details', `/location/${encodeURIComponent(best.id)}/details`, { language: 'de' }, detailsSchema);
      const rating = Number(details.rating);
      const count = Number(details.num_reviews);
      const lat = Number(details.latitude);
      const lng = Number(details.longitude);
      if (!Number.isFinite(rating) || rating <= 0 || !Number.isFinite(count) || count <= 0) return { status: 'unavailable', reason: 'not_found' };
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || distanceM(request.lat, request.lng, lat, lng) > MAX_DISTANCE_M) {
        return { status: 'unavailable', reason: 'not_found' };
      }
      return { status: 'ok', source: TRIPADVISOR_SOURCE, rating: Math.round(rating * 20) / 10, count: Math.round(count), url: details.web_url ?? null };
    },
  };
}
