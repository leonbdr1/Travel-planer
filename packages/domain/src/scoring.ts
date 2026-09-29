// Quality score (architektur.md 6.7, konzept.md 9.3). Stage 1: the rating,
// pulled towards the prior mean only below SCORE_FULL_WEIGHT_REVIEWS reviews
// (weight of the prior = the reviews missing to it). Stage 2 (hotels with a
// valid review check): recency, cleanliness and warning penalties.
import {
  SCORE_CLEANLINESS_WEIGHT,
  SCORE_CLEANLINESS_WEIGHT_CHIP,
  SCORE_MAX_PENALTY_BY_KIND,
  REVIEW_OLD_WEIGHT,
  SCORE_FULL_WEIGHT_REVIEWS_BY_KIND,
  SCORE_PRIOR_MEAN,
  UNIT_DEFECT_PENALTY_FACTOR,
  UNIT_DEFECT_TOPICS,
  SCORE_RECENCY_DAMPING,
  SCORE_RECENCY_MAX_DELTA,
  SCORE_RECENCY_MIN_COUNT,
  SCORE_RECENCY_WEIGHT,
  SEVERITY_WEIGHTS,
} from './constants';
import type { PropertyKind } from './property-kind';

export type Severity = keyof typeof SEVERITY_WEIGHTS;

export interface ReviewSignals {
  recentRating: number | null;
  recentCount: number;
  /** Reviews the check loaded, and those not older than REVIEW_FRESH_MONTHS; null for checks stored before. */
  loaded?: number | null | undefined;
  freshCount?: number | null | undefined;
  cleanliness: number | null;
  /** Confirmed warnings (topic with its highest severity). */
  warnings: Array<{ topic: string; severity: Severity }>;
}

export interface ScoreInput {
  /** 0–10 */
  rating: number | null;
  reviewCount: number | null;
  review: ReviewSignals | null;
  chips: readonly string[];
  /** Kind of accommodation (Aufgabe 6); missing: hotel, the former rule. */
  kind?: PropertyKind;
}

export interface ScoreBreakdown {
  /** Kind of accommodation and the review count from which its rating counts fully (Aufgabe 6). */
  propertyKind: PropertyKind;
  fullWeightReviews: number;
  rating: number | null;
  reviewCount: number;
  /** Reviews as they count: older ones with REVIEW_OLD_WEIGHT when their ages are known. */
  effectiveReviews: number;
  priorMean: number;
  priorWeight: number;
  s0: number | null;
  recency: { checked: boolean; applied: boolean; delta: number; s1: number | null };
  cleanliness: { applied: boolean; value: number | null; weight: number; s2: number | null };
  penalty: { total: number; items: Array<{ topic: string; severity: Severity; weight: number }> };
  quality: number | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * The review count as it weighs: with a review check, the fresh reviews it
 * loaded count fully and every other one (older, or not loaded) with
 * REVIEW_OLD_WEIGHT; without a check the ages are unknown and all count.
 */
export function effectiveReviewCount(reviewCount: number | null, review: ReviewSignals | null): number {
  const loaded = review?.loaded ?? null;
  const fresh = review?.freshCount ?? null;
  if (loaded === null || fresh === null) return reviewCount ?? 0;
  const total = Math.max(reviewCount ?? loaded, loaded);
  return Math.round((fresh + REVIEW_OLD_WEIGHT * (total - fresh)) * 10) / 10;
}

export function qualityScore(input: ScoreInput): ScoreBreakdown {
  const n = effectiveReviewCount(input.reviewCount, input.review);
  const kind = input.kind ?? 'hotel';
  const fullWeight = SCORE_FULL_WEIGHT_REVIEWS_BY_KIND[kind];
  const priorWeight = Math.max(0, fullWeight - n);
  const base: ScoreBreakdown = {
    propertyKind: kind,
    fullWeightReviews: fullWeight,
    rating: input.rating,
    reviewCount: input.reviewCount ?? 0,
    effectiveReviews: n,
    priorMean: SCORE_PRIOR_MEAN,
    priorWeight,
    s0: null,
    recency: { checked: input.review !== null, applied: false, delta: 0, s1: null },
    cleanliness: { applied: false, value: null, weight: 0, s2: null },
    penalty: { total: 0, items: [] },
    quality: null,
  };
  if (input.rating === null || n <= 0) return base;
  const s0 = (n * input.rating + priorWeight * SCORE_PRIOR_MEAN) / (n + priorWeight);
  let s1 = s0;
  let s2 = s0;
  let penaltyTotal = 0;
  const items: ScoreBreakdown['penalty']['items'] = [];
  const review = input.review;
  if (review) {
    if (review.recentRating !== null && review.recentCount >= SCORE_RECENCY_MIN_COUNT) {
      const delta = clamp(review.recentRating - input.rating, -SCORE_RECENCY_MAX_DELTA, SCORE_RECENCY_MAX_DELTA);
      s1 = s0 + (SCORE_RECENCY_WEIGHT * delta * review.recentCount) / (review.recentCount + SCORE_RECENCY_DAMPING);
      base.recency = { checked: true, applied: true, delta: r3(delta), s1: r3(s1) };
    } else {
      base.recency = { checked: true, applied: false, delta: 0, s1: r3(s1) };
    }
    s2 = s1;
    if (review.cleanliness !== null) {
      const w = input.chips.includes('sauber') ? SCORE_CLEANLINESS_WEIGHT_CHIP : SCORE_CLEANLINESS_WEIGHT;
      s2 = (1 - w) * s1 + w * review.cleanliness;
      base.cleanliness = { applied: true, value: review.cleanliness, weight: w, s2: r3(s2) };
    } else {
      base.cleanliness = { applied: false, value: null, weight: 0, s2: r3(s2) };
    }
    for (const warning of review.warnings) {
      const noise = warning.topic === 'laerm' && input.chips.includes('ruhig') ? 2 : 1;
      const unit = (UNIT_DEFECT_TOPICS as readonly string[]).includes(warning.topic) ? UNIT_DEFECT_PENALTY_FACTOR[kind] : 1;
      const weight = r3(SEVERITY_WEIGHTS[warning.severity] * noise * unit);
      items.push({ topic: warning.topic, severity: warning.severity, weight });
      penaltyTotal += weight;
    }
    penaltyTotal = Math.min(SCORE_MAX_PENALTY_BY_KIND[kind], penaltyTotal);
  }
  const quality = Math.round(clamp(s2 - penaltyTotal, 0, 10) * 10) / 10;
  return { ...base, s0: r3(s0), penalty: { total: r3(penaltyTotal), items }, quality };
}
