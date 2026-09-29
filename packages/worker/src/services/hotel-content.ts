// Hotel content for the evaluation (Testbetrieb finding 2026-09-28): the real
// rates answer carries only name, photo, address and rating per house. Review
// count, stars, coordinates, type and facilities come from the hotel details.
// Step `hotel-content` runs after the rates blocks and fills what is missing,
// from the details cache (the detail page uses the same entries) or with one
// details call per house (`liteapi_calls`, fail-closed). A house it cannot
// fill stays without review count and counts as unrated. Texts are requested
// in the site's language (`markets.language`, Ben 2026-09-29: the important
// information came in English); the cache key carries the language.
import { productConfig } from '@reiseplaner/config';
import {
  budgetReserve,
  budgetSettle,
  fillHotelContent,
  getCacheEntry,
  hotelsMissingContent,
  putCacheEntry,
  type HotelContentFill,
  type Queryable,
} from '@reiseplaner/db';
import { constants, normalizedRating, type HotelDetails } from '@reiseplaner/domain';
import type { LiteApiPort } from '@reiseplaner/providers';
import { sha256Hex } from './search-run';

export interface HotelContentDeps {
  db: Queryable;
  liteapi: LiteApiPort;
  now: () => Date;
  liteapiDailyCap: number;
}

export interface HotelContentResult {
  missing: number;
  reused: number;
  fetched: number;
  failed: number;
  skipped: number;
}

const DAY_MS = 86_400_000;

/** Language of descriptions, important information and facility names. */
export const CONTENT_LANGUAGE = productConfig.markets.language;

export const hotelContentKey = (hotelId: string) => sha256Hex(`hotel|${CONTENT_LANGUAGE}|${hotelId}`);

export async function cachedHotelDetails(db: Queryable, hotelId: string, now: Date): Promise<HotelDetails | null> {
  return getCacheEntry<HotelDetails>(db, 'hotel_content', await hotelContentKey(hotelId), now);
}

/** Details of one house: from the cache, else one call that is cached for HOTEL_CONTENT_TTL_DAYS. */
export async function fetchHotelDetails(db: Queryable, liteapi: LiteApiPort, hotelId: string, now: Date): Promise<HotelDetails> {
  const details = await liteapi.getHotel(hotelId, { language: CONTENT_LANGUAGE });
  await putCacheEntry(db, 'hotel_content', await hotelContentKey(hotelId), details, new Date(now.getTime() + constants.HOTEL_CONTENT_TTL_DAYS * DAY_MS));
  return details;
}

const inRange = (v: number | null, max: number) => (v !== null && Number.isFinite(v) && v >= 0 && v <= max ? v : null);

export function contentFill(d: HotelDetails): HotelContentFill {
  return {
    id: d.id,
    address: d.address,
    city: d.city,
    countryCode: d.countryCode,
    lat: d.lat,
    lng: d.lng,
    stars: inRange(d.stars, 5),
    rating: normalizedRating(d),
    reviewCount: d.reviewCount !== null && Number.isInteger(d.reviewCount) && d.reviewCount >= 0 ? d.reviewCount : null,
    hotelType: d.hotelType,
    facilityIds: d.facilityIds.filter((id) => Number.isInteger(id)),
  };
}

async function forEachLimited<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next] as T;
        next += 1;
        await fn(item);
      }
    }),
  );
}

/** Step `hotel-content`: review count, stars, coordinates and facilities of the search's houses. */
export async function runHotelContent(deps: HotelContentDeps, searchId: string): Promise<HotelContentResult> {
  const now = deps.now();
  const ids = await hotelsMissingContent(deps.db, searchId);
  const result: HotelContentResult = { missing: ids.length, reused: 0, fetched: 0, failed: 0, skipped: 0 };
  const stopAt = Date.now() + constants.HOTEL_CONTENT_STEP_BUDGET_S * 1000;
  const fills: HotelContentFill[] = [];
  await forEachLimited(ids, constants.LITEAPI_MAX_CONCURRENCY, async (hotelId) => {
    const cached = await cachedHotelDetails(deps.db, hotelId, now);
    if (cached) {
      fills.push(contentFill(cached));
      result.reused += 1;
      return;
    }
    if (Date.now() > stopAt || !(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) {
      result.skipped += 1;
      return;
    }
    try {
      fills.push(contentFill(await fetchHotelDetails(deps.db, deps.liteapi, hotelId, now)));
      result.fetched += 1;
    } catch {
      result.failed += 1;
    } finally {
      await budgetSettle(deps.db, 'liteapi_calls', 1, 1).catch(() => {
        // An unsettled reservation keeps counting against the cap (fail-safe).
      });
    }
  });
  await fillHotelContent(deps.db, fills);
  return result;
}
