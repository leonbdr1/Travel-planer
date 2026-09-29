// Review check (architektur.md 6.10, 6.15): workflow steps `reviews-fetch`
// (the hotels the traveller's goal puts first, reviews within budget, keyword
// scan, praise counts) and `reviews-verify` (skill reiseplaner.review-verify
// within the llm_usd budget, fallback "ungeprüft"), and the review data that
// scoring stage 2, the result views and the finale read.
import { productConfig } from '@reiseplaner/config';
import type { PraiseLabelDto, ReviewCheckDto, WarningDto } from '@reiseplaner/contracts';
import {
  budgetReserve,
  budgetSettle,
  deletePendingReview,
  getReviewChecks,
  listPendingReviews,
  pendingReviewHotels,
  putPendingReview,
  reviewChecksForSearch,
  upsertReviewCheck,
  type Queryable,
  type PendingScan,
  type ReviewCheck,
  type ReviewTopicRow,
} from '@reiseplaner/db';
import {
  aggregateFindings,
  aggregateUnverified,
  constants,
  countPraise,
  DEFAULT_GOAL,
  finalistIdsAcrossGoals,
  isPraiseTopic,
  isReviewTopic,
  PRAISE_LABELS,
  PRAISE_TOPICS,
  praiseLabels,
  REVIEW_TOPIC_LABELS,
  reviewCandidateIds,
  scanReviews,
  type HotelEvidence,
  type MentionStats,
  type PraiseTopic,
  type ReviewSignals,
  type ReviewSnippet,
  type ReviewsResult,
  type SkillFinding,
  type TopicResult,
} from '@reiseplaner/domain';
import type { LlmPort } from '@reiseplaner/providers';
import { dbSkillHooks, getSkill, runSkill } from '@reiseplaner/skills';
import { evaluateSearch, filtersFromRequest, loadSearchRequest, preselectHotels, type ReviewData } from './results';
import type { SearchRunDeps } from './search-run';

export const REVIEW_SKILL_ID = 'reiseplaner.review-verify';

export interface ReviewRunDeps extends SearchRunDeps {
  llm: LlmPort;
  llmEnabled: boolean;
  llmDailyBudgetUsd: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const FETCH_CONCURRENCY = 4;

function topicRow(t: TopicResult): ReviewTopicRow {
  return {
    topic: t.topic,
    confirmed_count: t.confirmedCount,
    unverified_count: t.unverifiedCount,
    recent_count: t.recentCount,
    latest_date: t.latestDate,
    severity: t.severity,
    guests: t.guests,
    share: t.share,
  };
}

/** The scan's hits and base; pending rows written before 2026-09-29 have only the snippets and the review count. */
function mentionStats(scan: PendingScan): MentionStats {
  if (!scan.mentions) return { base: scan.analyzed, hits: [] };
  return { base: scan.mentions.base, hits: scan.mentions.hits.flatMap((h) => (isReviewTopic(h.topic) ? [{ ...h, topic: h.topic }] : [])) };
}

/**
 * Guests and share of a stored topic; rows written before 2026-09-29 have
 * neither and fall back to the counted mentions over the reviews checked.
 */
function warningEvidence(t: ReviewTopicRow, reviewsAnalyzed: number): HotelEvidence['warnings'][number] {
  const count = t.confirmed_count + t.unverified_count;
  return {
    topic: t.topic,
    confirmed: t.confirmed_count,
    unverified: t.unverified_count,
    guests: t.guests ?? count,
    share: t.share ?? (reviewsAnalyzed > 0 ? Math.min(1, count / reviewsAnalyzed) : 0),
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

export interface ReviewsFetchResult {
  candidates: number;
  reused: number;
  fetched: number;
  pending: number;
  failed: number;
}

/**
 * Round 1 (architektur.md 6.15): the likely finalists of every goal, then the
 * traveller's goal order as reserve, REVIEW_TOP_N in total.
 * Follow-up rounds: with the results so far the scores move and checks take
 * houses out, so the finalists of every goal that still have no check, at
 * most REVIEW_FOLLOWUP_MAX per round.
 */
async function reviewCandidatesFor(deps: ReviewRunDeps, searchId: string, round: number): Promise<string[]> {
  const request = await loadSearchRequest(deps.db, searchId);
  const filters = filtersFromRequest(request);
  const goal = request.goal ?? DEFAULT_GOAL;
  if (round === 1) {
    const { evaluated, hotels } = await evaluateSearch(deps.db, searchId, filters);
    return reviewCandidateIds({ goal, evaluated, hotels: preselectHotels(hotels), evidence: new Map() }, constants.REVIEW_TOP_N);
  }
  const reviews = await loadReviewData(deps.db, searchId, filters.chips);
  const { evaluated, hotels } = await evaluateSearch(deps.db, searchId, filters, reviews);
  const known = new Set(reviews.checks?.keys() ?? []);
  return finalistIdsAcrossGoals({ goal, evaluated, hotels: preselectHotels(hotels), evidence: reviews.evidence ?? new Map() })
    .filter((id) => !known.has(id))
    .slice(0, constants.REVIEW_FOLLOWUP_MAX);
}

/**
 * Steps `reviews-fetch` (round 1) and `reviews-fetch-<n>` (follow-up rounds):
 * for the candidate hotels without a valid check, fetch reviews (one
 * `liteapi_calls` unit each, fail-closed), scan them for complaints and count
 * praise. Without complaint hits the check is stored right away; hits wait as
 * pending snippets for `reviews-verify`. Repeating the step skips pending hotels.
 */
export async function runReviewsFetch(deps: ReviewRunDeps, searchId: string, round = 1): Promise<ReviewsFetchResult> {
  const now = deps.now();
  const today = now.toISOString().slice(0, 10);
  const candidates = await reviewCandidatesFor(deps, searchId, round);
  const valid = new Set((await getReviewChecks(deps.db, candidates, now)).map((c) => c.hotelId));
  const alreadyPending = new Set(await pendingReviewHotels(deps.db, searchId));
  const result: ReviewsFetchResult = { candidates: candidates.length, reused: 0, fetched: 0, pending: 0, failed: 0 };

  await forEachLimited(candidates, FETCH_CONCURRENCY, async (hotelId) => {
    if (valid.has(hotelId)) {
      result.reused += 1;
      return;
    }
    if (alreadyPending.has(hotelId)) {
      result.pending += 1;
      return;
    }
    if (!(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) {
      result.failed += 1;
      return;
    }
    let reviews: ReviewsResult;
    try {
      reviews = await deps.liteapi.getReviews(hotelId, { limit: constants.REVIEW_MAX_REVIEWS, withSentiment: constants.LITEAPI_USE_SENTIMENT });
    } catch {
      result.failed += 1;
      return;
    } finally {
      await budgetSettle(deps.db, 'liteapi_calls', 1, 1).catch(() => {
        // An unsettled reservation keeps counting against the cap (fail-safe).
      });
    }
    result.fetched += 1;
    const scan = scanReviews(reviews.reviews, today);
    const praise = countPraise(reviews.reviews, today);
    const sentiment = reviews.sentiment?.categories.map((s) => ({ name: s.name, rating: s.rating })) ?? null;
    if (scan.snippets.length > 0) {
      await putPendingReview(deps.db, {
        searchId,
        hotelId,
        scan: {
          analyzed: scan.analyzed,
          loaded: scan.loaded,
          freshCount: scan.freshCount,
          latestReviewDate: scan.latestReviewDate,
          recentRating: scan.recentRating,
          recentCount: scan.recentCount,
          sentiment,
          praise,
          mentions: scan.mentions,
        },
        snippets: scan.snippets,
        expiresAt: new Date(now.getTime() + constants.REVIEW_PENDING_TTL_HOURS * HOUR_MS),
      });
      result.pending += 1;
      return;
    }
    await upsertReviewCheck(deps.db, {
      hotelId,
      status: scan.analyzed === 0 ? 'no_reviews' : 'ok',
      reviewsAnalyzed: scan.analyzed,
      reviewsLoaded: scan.loaded,
      freshCount: scan.freshCount,
      latestReviewDate: scan.latestReviewDate,
      recentRating: scan.recentRating,
      recentCount: scan.recentCount,
      topics: [],
      praise,
      sentiment,
      skillVersion: null,
      checkedAt: now,
      expiresAt: new Date(now.getTime() + constants.REVIEW_CACHE_DAYS * DAY_MS),
    });
  });
  return result;
}

/**
 * Step `reviews-verify`: the skill judges each pending hotel's snippets. With
 * AI off, no budget or a skill error the hits count as unverified (status
 * `skipped_budget`, no score penalty, shorter cache). Each processed hotel's
 * snippets are deleted.
 */
export async function runReviewsVerify(deps: ReviewRunDeps, searchId: string): Promise<{ verified: number; unverified: number }> {
  const now = deps.now();
  const today = now.toISOString().slice(0, 10);
  const skillVersion = getSkill(REVIEW_SKILL_ID).manifest.version;
  const result = { verified: 0, unverified: 0 };
  for (const p of await listPendingReviews(deps.db, searchId)) {
    const snippets = p.snippets.filter((s): s is ReviewSnippet => isReviewTopic(s.topicHint));
    const run =
      snippets.length === 0
        ? null
        : await runSkill<{ findings: SkillFinding[] }>(
            {
              llm: deps.llm,
              llmEnabled: deps.llmEnabled,
              prices: productConfig.ai,
              ...dbSkillHooks(deps.db, deps.llmDailyBudgetUsd),
            },
            REVIEW_SKILL_ID,
            { hotelName: p.hotelName, snippets: snippets.map(({ id, topicHint, date, lang, text }) => ({ id, topicHint, date, lang, text })) },
            { correlationId: `review:${searchId}:${p.hotelId}` },
          );
    const verified = run?.ok === true;
    const stats = mentionStats(p.scan);
    const topics = run?.ok ? aggregateFindings(snippets, run.output.findings, today, stats) : aggregateUnverified(snippets, today, stats);
    await upsertReviewCheck(deps.db, {
      hotelId: p.hotelId,
      status: verified ? 'ok' : 'skipped_budget',
      reviewsAnalyzed: p.scan.analyzed,
      reviewsLoaded: p.scan.loaded,
      freshCount: p.scan.freshCount,
      latestReviewDate: p.scan.latestReviewDate,
      recentRating: p.scan.recentRating,
      recentCount: p.scan.recentCount,
      topics: topics.map(topicRow),
      praise: p.scan.praise,
      sentiment: p.scan.sentiment,
      skillVersion: verified ? skillVersion : null,
      checkedAt: now,
      expiresAt: new Date(now.getTime() + (verified ? constants.REVIEW_CACHE_DAYS * DAY_MS : constants.REVIEW_UNVERIFIED_CACHE_HOURS * HOUR_MS)),
    });
    await deletePendingReview(deps.db, searchId, p.hotelId);
    if (verified) result.verified += 1;
    else result.unverified += 1;
  }
  return result;
}

export interface ReviewDataWithChecks extends ReviewData {
  checks?: ReadonlyMap<string, ReviewCheckDto>;
}

export const NO_REVIEW_DATA: ReviewDataWithChecks = {
  signals: new Map(),
  warnings: new Map(),
  status: new Map(),
  checks: new Map(),
  checked: new Map(),
  labels: new Map(),
  evidence: new Map(),
};

const labelDto = (topic: PraiseTopic): PraiseLabelDto => ({ topic, label: PRAISE_LABELS[topic].label });

/** "Frühstück: 23× gelobt, 2× kritisiert", in topic order. */
function praiseDtos(check: ReviewCheck): ReviewCheckDto['praise'] {
  return PRAISE_TOPICS.flatMap((topic) => {
    const row = check.praise.find((p) => p.topic === topic);
    return row && isPraiseTopic(row.topic) ? [{ topic, label: PRAISE_LABELS[topic].topic, praised: row.praised, criticized: row.criticized }] : [];
  });
}

/** Cleanliness (1–10) from the provider's category ratings, if fetched. */
function cleanlinessOf(check: ReviewCheck): number | null {
  const category = check.sentiment?.find((s) => /clean|sauber/i.test(s.name));
  return category ? Math.max(1, Math.min(10, category.rating)) : null;
}

function warningsOf(check: ReviewCheck): WarningDto[] {
  const verified = check.status === 'ok';
  return check.topics
    .filter((t) => isReviewTopic(t.topic) && (verified ? t.confirmed_count : t.unverified_count) > 0)
    .map((t) => ({
      topic: t.topic,
      label: isReviewTopic(t.topic) ? REVIEW_TOPIC_LABELS[t.topic] : t.topic,
      count: verified ? t.confirmed_count : t.unverified_count,
      recent_count: t.recent_count,
      latest_date: t.latest_date,
      verified,
      severity: verified ? t.severity : null,
      ai_provenance: verified ? ('ai_assisted' as const) : null,
    }));
}

/**
 * Review checks of a search's hotels as scoring signals (stage 2), warnings,
 * praise labels, evidence for the pre-selection and detail DTOs.
 */
export async function loadReviewData(db: Queryable, searchId: string, _chips: readonly string[]): Promise<ReviewDataWithChecks> {
  const signals = new Map<string, ReviewSignals | null>();
  const warnings = new Map<string, WarningDto[]>();
  const status = new Map<string, 'ok' | 'unverified'>();
  const checks = new Map<string, ReviewCheckDto>();
  const checked = new Map<string, number>();
  const labels = new Map<string, PraiseLabelDto[]>();
  const evidence = new Map<string, HotelEvidence>();
  for (const check of await reviewChecksForSearch(db, searchId)) {
    if (check.status === 'failed') continue;
    const isChecked = check.status === 'ok' || check.status === 'skipped_budget';
    if (isChecked) checked.set(check.hotelId, check.reviewsAnalyzed);
    const w = warningsOf(check);
    signals.set(check.hotelId, {
      recentRating: check.recentRating,
      recentCount: check.recentCount,
      loaded: check.reviewsLoaded,
      freshCount: check.freshCount,
      cleanliness: cleanlinessOf(check),
      // Only confirmed warnings reduce the score; unverified hints never do.
      warnings: check.status === 'ok' ? check.topics.flatMap((t) => (t.confirmed_count > 0 && t.severity ? [{ topic: t.topic, severity: t.severity }] : [])) : [],
    });
    warnings.set(check.hotelId, w);
    if (check.status === 'ok') status.set(check.hotelId, 'ok');
    if (check.status === 'skipped_budget') status.set(check.hotelId, 'unverified');
    // A label never stands next to a warning on its topic (PRAISE_BLOCKED_BY).
    const praised = praiseLabels(check.praise, new Set(w.map((x) => x.topic)));
    const labelDtos = praised.map(labelDto);
    labels.set(check.hotelId, labelDtos);
    evidence.set(check.hotelId, {
      checked: isChecked,
      warnings: check.topics.map((t) => warningEvidence(t, check.reviewsAnalyzed)),
      labels: praised,
    });
    checks.set(check.hotelId, {
      status: check.status,
      ai_assisted: check.skillVersion !== null,
      reviews_checked: check.reviewsAnalyzed,
      recent_rating: check.recentRating,
      recent_count: check.recentCount,
      warnings: w,
      labels: labelDtos,
      praise: praiseDtos(check),
      checked_at: check.checkedAt,
    });
  }
  return { signals, warnings, status, checks, checked, labels, evidence };
}
