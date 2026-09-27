// Public reference price (architektur.md 7.2 and 8.1, LiteAPI "Get cached
// public price", beta): the price of the same stay at a public booking site,
// shown as a neutral comparison in the hotel detail view.
//
// ⟂ Contract status: path and response of the LiteAPI endpoint could not be
// verified (docs.liteapi.travel blocked in the build session, no sandbox key,
// BG-05). The live adapter therefore makes no call and answers
// `contract_unverified` until the S2.2 contract check adds it. The fake
// adapter answers from the simulated world.
import type { Occupancy } from '@reiseplaner/domain';

export interface ReferencePriceRequest {
  hotelId: string;
  checkin: string;
  checkout: string;
  occupancies: Occupancy[];
  currency: string;
}

export type ReferencePriceResult =
  | { status: 'ok'; totalCents: number; currency: string; source: string }
  | { status: 'unavailable'; reason: 'no_public_price' | 'contract_unverified' };

export interface ReferencePricePort {
  /** false while the live contract is unverified; callers skip budgets then. */
  readonly configured: boolean;
  getReferencePrice(request: ReferencePriceRequest): Promise<ReferencePriceResult>;
}

export function createUnverifiedReferencePrice(): ReferencePricePort {
  return {
    configured: false,
    getReferencePrice: async () => ({ status: 'unavailable', reason: 'contract_unverified' }),
  };
}
