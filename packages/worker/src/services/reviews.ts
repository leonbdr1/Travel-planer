// Review check data for scoring and display (architektur.md 6.10). Filled in
// M7; until then no hotel has a review check.
import type { ReviewCheckDto } from '@reiseplaner/contracts';
import type { Queryable } from '@reiseplaner/db';
import type { ReviewData } from './results';

export interface ReviewDataWithChecks extends ReviewData {
  checks?: ReadonlyMap<string, ReviewCheckDto>;
}

export const NO_REVIEW_DATA: ReviewDataWithChecks = { signals: new Map(), warnings: new Map(), status: new Map(), checks: new Map() };

export async function loadReviewData(_db: Queryable, _searchId: string, _chips: readonly string[]): Promise<ReviewDataWithChecks> {
  return { signals: new Map(), warnings: new Map(), status: new Map(), checks: new Map() };
}
