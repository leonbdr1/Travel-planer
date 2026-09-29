// Simulated external rating source: knows about 70 % of the houses, more often
// the ones with few own reviews (small houses are exactly what it is for).
import type { RatingLookup, RatingLookupResult, RatingSourcePort } from '../rating-source/port';
import { between, intBetween, seeded } from './random';
import { hotelById } from './world';

export const FAKE_RATING_SOURCE = 'Tripadvisor';

export function createFakeRatingSource(options: { onCall?: (endpoint: string) => void; latencyMs?: number } = {}): RatingSourcePort {
  return {
    configured: true,
    async lookup(request: RatingLookup): Promise<RatingLookupResult> {
      options.onCall?.('rating-lookup');
      if (options.latencyMs) await new Promise((r) => setTimeout(r, options.latencyMs));
      const hotel = hotelById(request.hotelId);
      if (!hotel) return { status: 'unavailable', reason: 'not_found' };
      const r = seeded('external-rating', hotel.id);
      if (r() >= 0.7) return { status: 'unavailable', reason: 'not_found' };
      return {
        status: 'ok',
        source: FAKE_RATING_SOURCE,
        rating: Math.round(between(r, 6.6, 9.4) * 10) / 10,
        count: intBetween(r, 25, 420),
        url: null,
      };
    },
  };
}
