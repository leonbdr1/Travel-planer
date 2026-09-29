// External rating source (Testbetrieb 2026-09-29: many small houses have no
// rating in LiteAPI although they have many elsewhere). The port answers with a
// rating on the scale 0–10 and its review count; the domain fuses it with the
// own rating (`fuseRatings`).
//
// Decision (Ben, 2026-09-29): no Google Places (paid), no SerpApi or scraping
// (not viable in production). The planned real source is the Tripadvisor
// Content API (free tier, attribution duty).
//
// The live adapter (`tripadvisor.ts`) is used when a key is configured; without
// one the port answers `contract_unverified` and makes no call. The fake
// adapter answers from the simulated world.

export interface RatingLookup {
  hotelId: string;
  name: string;
  city: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
}

export type RatingLookupResult =
  | { status: 'ok'; source: string; rating: number; count: number; url: string | null }
  | { status: 'unavailable'; reason: 'not_found' | 'contract_unverified' };

export interface RatingSourcePort {
  /** false while the live contract is unverified; callers skip budgets then. */
  readonly configured: boolean;
  /** API calls one lookup can use; the caller reserves this many `rating_calls`. */
  readonly callsPerLookup: number;
  lookup(request: RatingLookup): Promise<RatingLookupResult>;
}

export function createUnverifiedRatingSource(): RatingSourcePort {
  return {
    configured: false,
    callsPerLookup: 0,
    lookup: async () => ({ status: 'unavailable', reason: 'contract_unverified' }),
  };
}
