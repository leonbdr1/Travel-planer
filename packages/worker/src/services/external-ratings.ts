// Step `external-ratings` (Testbetrieb 2026-09-29): houses without a rating or
// with few reviews in LiteAPI are looked up at the additional rating source
// (`RatingSourcePort`); the answer is stored per house for
// EXTERNAL_RATING_TTL_DAYS, also "not found", so a house is asked once. The
// fusion with the own rating happens when a search is evaluated (`fuseRatings`).
// Every lookup reserves `rating_calls` first (fail-closed); a source whose
// contract is unverified is not called at all.
import {
  budgetReserve,
  budgetSettle,
  hotelsNeedingExternalRating,
  saveExternalRatings,
  type ExternalRatings,
  type Queryable,
} from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';
import type { RatingSourcePort } from '@reiseplaner/providers';

export interface ExternalRatingsDeps {
  db: Queryable;
  ratings: RatingSourcePort;
  now: () => Date;
  ratingDailyCap: number;
}

export interface ExternalRatingsResult {
  candidates: number;
  found: number;
  notFound: number;
  failed: number;
  skipped: number;
}

const DAY_MS = 86_400_000;
const CONCURRENCY = 4;

export async function runExternalRatings(deps: ExternalRatingsDeps, searchId: string): Promise<ExternalRatingsResult> {
  const result: ExternalRatingsResult = { candidates: 0, found: 0, notFound: 0, failed: 0, skipped: 0 };
  if (!deps.ratings.configured) return result;
  const now = deps.now();
  const staleBefore = new Date(now.getTime() - constants.EXTERNAL_RATING_TTL_DAYS * DAY_MS);
  const houses = await hotelsNeedingExternalRating(deps.db, searchId, constants.EXTERNAL_RATING_BELOW_REVIEWS, staleBefore);
  result.candidates = houses.length;
  const stopAt = Date.now() + constants.EXTERNAL_RATING_STEP_BUDGET_S * 1000;
  const entries: Array<{ id: string; ratings: ExternalRatings }> = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, houses.length) }, async () => {
      while (next < houses.length) {
        const house = houses[next];
        next += 1;
        if (!house) break;
        if (Date.now() > stopAt || !(await budgetReserve(deps.db, 'rating_calls', deps.ratings.callsPerLookup, deps.ratingDailyCap))) {
          result.skipped += 1;
          continue;
        }
        try {
          const answer = await deps.ratings.lookup({ hotelId: house.id, name: house.name, city: house.city, countryCode: house.countryCode, lat: house.lat, lng: house.lng });
          const checkedAt = now.toISOString();
          if (answer.status === 'ok') {
            entries.push({ id: house.id, ratings: { checkedAt, sources: { [answer.source]: { rating: answer.rating, count: answer.count, url: answer.url } } } });
            result.found += 1;
          } else if (answer.reason === 'not_found') {
            entries.push({ id: house.id, ratings: { checkedAt, sources: {} } });
            result.notFound += 1;
          }
        } catch {
          // A failed lookup stays unanswered and is asked again by the next search.
          result.failed += 1;
        } finally {
          await budgetSettle(deps.db, 'rating_calls', deps.ratings.callsPerLookup, deps.ratings.callsPerLookup).catch(() => {
            // An unsettled reservation keeps counting against the cap (fail-safe).
          });
        }
      }
    }),
  );
  await saveExternalRatings(deps.db, entries);
  return result;
}
