// Comparison price (Ben, 2026-09-28): lists and the finale go by price, the
// cheapest first. The recommendation is the house with the lowest comparison
// price = price / (1 + bonus), where only proven advantages earn a bonus:
// many reviews (MANY_REVIEWS_BONUS), a better score above the goal's floor
// (GOAL_QUALITY_BONUS_PER_POINT) and, for "komfort", extras. A brand or a
// mere review volume never outweighs a clearly lower price: a house with
// 2,000 reviews wins against one with 80 at the same score only when it
// costs at most about 5 % more.
import {
  GOAL_QUALITY_BONUS_PER_POINT,
  GOAL_QUALITY_FLOOR,
  KOMFORT_EXTRA_BONUS,
  KOMFORT_EXTRAS_BONUS_MAX,
  MANY_REVIEWS_BONUS,
  MANY_REVIEWS_MIN,
} from './constants';
import type { Goal } from './vocabulary';

/** Extras a traveller pays for (and a fake listing likes to promise). */
export const PREMIUM_FEATURES: readonly string[] = ['fruehstueck_inklusive', 'halbpension', 'sauna_wellness', 'schwimmbad'];

export function premiumExtras(featureCodes: Iterable<string>): number {
  const codes = new Set(featureCodes);
  return PREMIUM_FEATURES.filter((f) => codes.has(f)).length;
}

/** Reviews as they count (older ones weigh less, see effectiveReviewCount). */
export function hasManyReviews(effectiveReviews: number | null | undefined): boolean {
  return (effectiveReviews ?? 0) >= MANY_REVIEWS_MIN;
}

export interface ComparisonInput {
  totalCents: number;
  quality: number | null;
  /** Effective review count (ScoreBreakdown.effectiveReviews). */
  reviews: number;
  /** Number of PREMIUM_FEATURES the offer brings. */
  extras: number;
}

export function comparisonBonus(x: ComparisonInput, goal: Goal): number {
  const quality = x.quality === null ? 0 : Math.max(0, x.quality - GOAL_QUALITY_FLOOR[goal]) * GOAL_QUALITY_BONUS_PER_POINT[goal];
  const reviews = hasManyReviews(x.reviews) ? MANY_REVIEWS_BONUS : 0;
  const extras = goal === 'komfort' ? Math.min(KOMFORT_EXTRAS_BONUS_MAX, x.extras * KOMFORT_EXTRA_BONUS) : 0;
  return quality + reviews + extras;
}

export function comparisonCents(x: ComparisonInput, goal: Goal): number {
  return x.totalCents / (1 + comparisonBonus(x, goal));
}

/** Lowest comparison price first; on a tie the cheaper, then the better one. */
export function byComparison(goal: Goal) {
  return (a: ComparisonInput, b: ComparisonInput): number =>
    comparisonCents(a, goal) - comparisonCents(b, goal) || a.totalCents - b.totalCents || (b.quality ?? 0) - (a.quality ?? 0);
}

/** Index of the recommendation: the lowest comparison price among rated items; null when none is rated. */
export function recommendedIndex(items: readonly ComparisonInput[], goal: Goal): number | null {
  const cmp = byComparison(goal);
  let best: number | null = null;
  items.forEach((x, i) => {
    if (x.quality === null) return;
    if (best === null || cmp(x, items[best] as ComparisonInput) < 0) best = i;
  });
  return best;
}
