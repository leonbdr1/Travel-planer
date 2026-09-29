// External rating source (Testbetrieb 2026-09-29: many small houses have no
// rating in LiteAPI although they have many elsewhere). The port answers with a
// rating on the scale 0–10 and its review count; the domain fuses it with the
// own rating (`fuseRatings`).
//
// Decision (Ben, 2026-09-29): no Google Places (paid), no SerpApi or scraping
// (not viable in production). The planned real source is the Tripadvisor
// Content API (free tier, attribution duty).
//
// ⟂ Contract status: the Tripadvisor documentation could not be verified in the
// build session (host blocked, no key, account with credit card is a BEN-GATE).
// The live adapter therefore makes no call and answers `contract_unverified`;
// the fake adapter answers from the simulated world.

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
  lookup(request: RatingLookup): Promise<RatingLookupResult>;
}

export function createUnverifiedRatingSource(): RatingSourcePort {
  return {
    configured: false,
    lookup: async () => ({ status: 'unavailable', reason: 'contract_unverified' }),
  };
}
