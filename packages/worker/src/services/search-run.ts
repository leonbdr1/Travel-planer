// The search run behind SearchWorkflow (architektur.md 6.4): `load`,
// `rates-<n>` blocks and `finalize`. Every step is idempotent (combination
// states, offer upserts on the unique key) and returns only ids and counters.
import {
  budgetReserve,
  budgetSettle,
  combinationBlock,
  failPendingCombinations,
  getCacheEntry,
  getSearch,
  markCombination,
  markSearchRunning,
  putCacheEntry,
  recountSearch,
  setSearchStatus,
  upsertHotels,
  upsertOffers,
  type CombinationTask,
  type HotelUpsert,
  type Queryable,
} from '@reiseplaner/db';
import {
  constants,
  normalizedRating,
  normalizeOffers,
  occupancyKey,
  splitOccupancy,
  type HotelSummary,
  type NormalizedOffer,
  type Occupancy,
} from '@reiseplaner/domain';
import { ProviderError, type LiteApiPort, type ProviderSource } from '@reiseplaner/providers';
import { searchRequestSchema, type SearchRequest } from '@reiseplaner/contracts';
import { runScore } from './results';
import { loadReviewData } from './reviews';

export interface SearchRunDeps {
  db: Queryable;
  liteapi: LiteApiPort;
  /** Source of `liteapi` (default fake); cached rates are only reused from the same source. */
  liteapiSource?: ProviderSource;
  now: () => Date;
  liteapiDailyCap: number;
  currency: string;
  guestNationality: string;
  marginPercent?: number;
}

interface CachedRates {
  hotels: HotelUpsert[];
  offers: NormalizedOffer[];
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cache key for rates (architektur.md 5.3): place | checkin | checkout | occupancy | currency | nationality | margin. */
export function ratesCacheKey(c: Pick<CombinationTask, 'placeId' | 'checkin' | 'checkout'>, occupancies: readonly Occupancy[], deps: SearchRunDeps) {
  return sha256Hex(
    [deps.liteapiSource ?? 'fake', c.placeId, c.checkin, c.checkout, occupancyKey(occupancies), deps.currency, deps.guestNationality, deps.marginPercent ?? 'none'].join('|'),
  );
}

function hotelUpsert(h: HotelSummary): HotelUpsert {
  return {
    id: h.id,
    name: h.name,
    address: h.address,
    city: h.city,
    countryCode: h.countryCode,
    lat: h.lat,
    lng: h.lng,
    stars: h.stars,
    rating: normalizedRating(h),
    reviewCount: h.reviewCount,
    hotelType: h.hotelType,
    mainPhotoUrl: h.mainPhotoUrl,
    facilityIds: h.facilityIds,
  };
}

async function loadRequest(db: Queryable, searchId: string): Promise<{ request: SearchRequest; startedAt: string | null; total: number }> {
  const search = await getSearch(db, searchId);
  if (!search) throw new Error(`search ${searchId} not found`);
  return { request: searchRequestSchema.parse(search.request), startedAt: search.startedAt, total: search.combosTotal };
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000);
}

export async function runLoad(deps: SearchRunDeps, searchId: string): Promise<{ blocks: number; total: number }> {
  const { total } = await loadRequest(deps.db, searchId);
  await markSearchRunning(deps.db, searchId);
  return { blocks: Math.ceil(total / constants.SEARCH_BLOCK_SIZE), total };
}

async function pool<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next] as T;
      next += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export interface BlockResult {
  processed: number;
  fetched: number;
  cached: number;
  failed: number;
  timedOut: boolean;
}

export async function runRatesBlock(deps: SearchRunDeps, searchId: string, index: number): Promise<BlockResult> {
  const { request, startedAt } = await loadRequest(deps.db, searchId);
  const result: BlockResult = { processed: 0, fetched: 0, cached: 0, failed: 0, timedOut: false };
  const deadline = Date.parse(startedAt ?? deps.now().toISOString()) + constants.SEARCH_JOB_TIMEOUT_S * 1000;
  if (deps.now().getTime() > deadline) {
    await failPendingCombinations(deps.db, searchId, 'timeout');
    await recountSearch(deps.db, searchId);
    return { ...result, timedOut: true };
  }
  const occupancies = splitOccupancy(request.occupancy.rooms, request.occupancy.adults, request.occupancy.children_ages);
  if (!occupancies) throw new Error('invalid occupancy');
  // Rooms are mapped to the largest group in one room (Aufgabe 5).
  const persons = Math.max(...occupancies.map((o) => o.adults + o.childrenAges.length));
  const block = (await combinationBlock(deps.db, searchId, index, constants.SEARCH_BLOCK_SIZE)).filter((c) => c.status === 'pending');
  let reserved = 0;

  await pool(block, constants.LITEAPI_MAX_CONCURRENCY, async (c) => {
    result.processed += 1;
    if (deps.now().getTime() > deadline) {
      await markCombination(deps.db, c.id, 'failed', 0, 'timeout');
      result.failed += 1;
      result.timedOut = true;
      return;
    }
    const key = await ratesCacheKey(c, occupancies, deps);
    const cached = await getCacheEntry<CachedRates>(deps.db, 'rates', key, deps.now());
    if (cached) {
      await upsertHotels(deps.db, cached.hotels);
      await upsertOffers(deps.db, searchId, c.id, cached.offers);
      await markCombination(deps.db, c.id, 'cached', cached.offers.length);
      result.cached += 1;
      return;
    }
    if (!(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) {
      await markCombination(deps.db, c.id, 'failed', 0, 'quota');
      result.failed += 1;
      return;
    }
    reserved += 1;
    try {
      const rates = await deps.liteapi.searchRates({
        lat: c.lat,
        lng: c.lng,
        radiusKm: c.searchRadiusKm,
        checkin: c.checkin,
        checkout: c.checkout,
        occupancies,
        currency: deps.currency,
        guestNationality: deps.guestNationality,
        timeoutS: constants.LITEAPI_RATES_TIMEOUT_S,
        limit: constants.LITEAPI_RATES_LIMIT,
        ...(deps.marginPercent === undefined ? {} : { marginPercent: deps.marginPercent }),
      });
      const offers = normalizeOffers(rates.rates, nightsBetween(c.checkin, c.checkout), persons);
      const withOffers = new Set(offers.map((o) => o.hotelId));
      const hotels = rates.hotels.filter((h) => withOffers.has(h.id)).map(hotelUpsert);
      await upsertHotels(deps.db, hotels);
      await upsertOffers(deps.db, searchId, c.id, offers);
      await putCacheEntry(deps.db, 'rates', key, { hotels, offers } satisfies CachedRates, new Date(deps.now().getTime() + constants.RATE_CACHE_TTL_MIN * 60_000));
      await markCombination(deps.db, c.id, 'done', offers.length);
      result.fetched += 1;
    } catch (err) {
      const reason = err instanceof ProviderError ? err.kind : 'error';
      await markCombination(deps.db, c.id, 'failed', 0, reason);
      result.failed += 1;
    }
  });

  if (reserved > 0) {
    try {
      await budgetSettle(deps.db, 'liteapi_calls', reserved, reserved);
    } catch {
      // Unsettled reservations keep counting against the cap (fail-safe).
    }
  }
  await recountSearch(deps.db, searchId);
  return result;
}

/** Step `score-1`: filters, quality stage 1, bargains and rank for the search's own filters. */
export async function runScoreStep(deps: SearchRunDeps, searchId: string) {
  const { request } = await loadRequest(deps.db, searchId);
  return runScore(deps.db, searchId, request);
}

/**
 * Step `finalize`: quality score stage 2 with the review checks, bargains and
 * rank recomputed and stored; then status done, partial or failed.
 */
export async function runFinalize(deps: SearchRunDeps, searchId: string): Promise<{ status: 'done' | 'partial' | 'failed'; done: number; failed: number }> {
  const { request } = await loadRequest(deps.db, searchId);
  await runScore(deps.db, searchId, request, await loadReviewData(deps.db, searchId, request.chips), null);
  await failPendingCombinations(deps.db, searchId, 'timeout');
  const { done, failed, total } = await recountSearch(deps.db, searchId);
  const status = failed === 0 ? 'done' : failed >= total ? 'failed' : 'partial';
  await setSearchStatus(deps.db, searchId, status, status === 'failed' ? 'all_combinations_failed' : null);
  return { status, done, failed };
}
