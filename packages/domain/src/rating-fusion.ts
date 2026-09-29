// Fusion of rating sources (Testbetrieb 2026-09-29: many small houses have no
// rating in LiteAPI). Each source is normalised to 0–10 before it gets here.
// The fused rating is the mean weighted by review counts, external reviews
// counting `externalWeight` each; the fused count is the weighted count, so
// stage 1 of the quality score (6.7) treats it like any other count.
import { EXTERNAL_RATING_WEIGHT } from './constants';

export interface RatingEvidence {
  /** Rating on the scale 0–10. */
  rating: number;
  count: number;
}

export interface FusedRating {
  rating: number;
  count: number;
  /** true when at least one external source contributed. */
  fused: boolean;
}

const usable = (e: RatingEvidence | null | undefined): e is RatingEvidence =>
  e !== null && e !== undefined && Number.isFinite(e.rating) && e.rating >= 0 && e.rating <= 10 && Number.isInteger(e.count) && e.count > 0;

export function fuseRatings(
  own: { rating: number | null; count: number | null },
  external: readonly RatingEvidence[],
  externalWeight: number = EXTERNAL_RATING_WEIGHT,
): FusedRating | null {
  const ownEvidence = own.rating !== null && own.count !== null ? { rating: own.rating, count: own.count } : null;
  const parts: { rating: number; weight: number }[] = [];
  if (usable(ownEvidence)) parts.push({ rating: ownEvidence.rating, weight: ownEvidence.count });
  const externals = external.filter(usable);
  for (const e of externals) parts.push({ rating: e.rating, weight: e.count * externalWeight });
  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  if (parts.length === 0 || total <= 0) return null;
  const rating = parts.reduce((sum, p) => sum + p.rating * p.weight, 0) / total;
  return { rating: Math.round(rating * 100) / 100, count: Math.max(1, Math.round(total)), fused: externals.length > 0 };
}
