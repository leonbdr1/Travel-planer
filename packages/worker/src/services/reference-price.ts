// Public reference price for one offer of a search (architektur.md 7.2, cache
// 6 h). Fail-closed: a paid provider call needs a `liteapi_calls` reservation
// first; without one the answer is `quota`. Results with and without a public
// price are cached; provider errors are not.
import type { SearchRequest } from '@reiseplaner/contracts';
import { budgetReserve, budgetSettle, getCacheEntry, putCacheEntry, type Queryable, type SearchOfferRef } from '@reiseplaner/db';
import { constants, occupancyKey, splitOccupancy } from '@reiseplaner/domain';
import type { ReferencePricePort, ReferencePriceResult } from '@reiseplaner/providers';
import { sha256Hex } from './search-run';

export interface ReferencePriceDeps {
  db: Queryable;
  port: ReferencePricePort;
  now: Date;
  liteapiDailyCap: number;
}

export type ReferencePriceOutcome =
  | { status: 'ok'; totalCents: number; currency: string; source: string; fetchedAt: string }
  | { status: 'unavailable'; reason: 'no_public_price' | 'contract_unverified' | 'quota' | 'provider_error' };

interface CachedReference {
  result: ReferencePriceResult;
  fetchedAt: string;
}

function fromResult(result: ReferencePriceResult, fetchedAt: string): ReferencePriceOutcome {
  return result.status === 'ok' ? { ...result, fetchedAt } : result;
}

export async function referencePriceFor(deps: ReferencePriceDeps, request: SearchRequest, offer: SearchOfferRef): Promise<ReferencePriceOutcome> {
  if (!deps.port.configured) return { status: 'unavailable', reason: 'contract_unverified' };
  const occupancies = splitOccupancy(request.occupancy.rooms, request.occupancy.adults, request.occupancy.children_ages);
  if (!occupancies) return { status: 'unavailable', reason: 'no_public_price' };
  const key = await sha256Hex(['reference', offer.hotelId, offer.checkin, offer.checkout, occupancyKey(occupancies), offer.currency].join('|'));
  const cached = await getCacheEntry<CachedReference>(deps.db, 'reference_price', key, deps.now);
  if (cached) return fromResult(cached.result, cached.fetchedAt);

  if (!(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) return { status: 'unavailable', reason: 'quota' };
  let result: ReferencePriceResult;
  try {
    result = await deps.port.getReferencePrice({
      hotelId: offer.hotelId,
      checkin: offer.checkin,
      checkout: offer.checkout,
      occupancies,
      currency: offer.currency,
    });
  } catch {
    return { status: 'unavailable', reason: 'provider_error' };
  } finally {
    await budgetSettle(deps.db, 'liteapi_calls', 1, 1).catch(() => {
      // An unsettled reservation keeps counting against the cap (fail-safe).
    });
  }
  const fetchedAt = deps.now.toISOString();
  await putCacheEntry(deps.db, 'reference_price', key, { result, fetchedAt } satisfies CachedReference, new Date(deps.now.getTime() + constants.REFERENCE_PRICE_CACHE_TTL_H * 3_600_000));
  return fromResult(result, fetchedAt);
}
