// Review check (architektur.md 6.10): workflow steps `reviews-fetch` (top
// hotels, reviews within budget, keyword scan) and `reviews-verify` (skill
// reiseplaner.review-verify within the llm_usd budget, fallback "ungeprüft"),
// and the review data that scoring stage 2 and the result views read.
import { productConfig } from '@reiseplaner/config';
import type { ReviewCheckDto, WarningDto } from '@reiseplaner/contracts';
import {
  budgetReserve,
  budgetSettle,
  deletePendingReview,
  getReviewChecks,
  listPendingReviews,
  pendingReviewHotels,
  putPendingReview,
  reviewCandidates,
  reviewChecksForSearch,
  upsertReviewCheck,
  type Queryable,
  type ReviewCheck,
  type ReviewTopicRow,
} from '@reiseplaner/db';
import {
  aggregateFindings,
  aggregateUnverified,
  constants,
  isReviewTopic,
  REVIEW_TOPIC_LABELS,
  scanReviews,
  type ReviewSignals,
  type ReviewSnippet,
  type ReviewsResult,
  type SkillFinding,
  type TopicResult,
} from '@reiseplaner/domain';
import type { LlmPort } from '@reiseplaner/providers';
import { dbSkillHooks, getSkill, runSkill } from '@reiseplaner/skills';
import type { ReviewData } from './results';
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
 * Step `reviews-fetch`: for the top REVIEW_TOP_N hotels without a valid
 * check, fetch reviews (one `liteapi_calls` unit each, fail-closed) and scan
 * them. Without hits the check is stored right away; hits wait as pending
 * snippets for `reviews-verify`. Repeating the step skips pending hotels.
 */
export async function runReviewsFetch(deps: ReviewRunDeps, searchId: string): Promise<ReviewsFetchResult> {
  const now = deps.now();
  const today = now.toISOString().slice(0, 10);
  const candidates = await reviewCandidates(deps.db, searchId, constants.REVIEW_TOP_N);
  const valid = new Set((await getReviewChecks(deps.db, candidates.map((c) => c.hotelId), now)).map((c) => c.hotelId));
  const alreadyPending = new Set(await pendingReviewHotels(deps.db, searchId));
  const result: ReviewsFetchResult = { candidates: candidates.length, reused: 0, fetched: 0, pending: 0, failed: 0 };

  await forEachLimited(candidates, FETCH_CONCURRENCY, async (c) => {
    if (valid.has(c.hotelId)) {
      result.reused += 1;
      return;
    }
    if (alreadyPending.has(c.hotelId)) {
      result.pending += 1;
      return;
    }
    if (!(await budgetReserve(deps.db, 'liteapi_calls', 1, deps.liteapiDailyCap))) {
      result.failed += 1;
      return;
    }
    let reviews: ReviewsResult;
    try {
      reviews = await deps.liteapi.getReviews(c.hotelId, { limit: constants.REVIEW_MAX_REVIEWS, withSentiment: constants.LITEAPI_USE_SENTIMENT });
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
    const sentiment = reviews.sentiment?.categories.map((s) => ({ name: s.name, rating: s.rating })) ?? null;
    if (scan.snippets.length > 0) {
      await putPendingReview(deps.db, {
        searchId,
        hotelId: c.hotelId,
        scan: {
          analyzed: scan.analyzed,
          latestReviewDate: scan.latestReviewDate,
          recentRating: scan.recentRating,
          recentCount: scan.recentCount,
          sentiment,
        },
        snippets: scan.snippets,
        expiresAt: new Date(now.getTime() + constants.REVIEW_PENDING_TTL_HOURS * HOUR_MS),
      });
      result.pending += 1;
      return;
    }
    await upsertReviewCheck(deps.db, {
      hotelId: c.hotelId,
      status: scan.analyzed === 0 ? 'no_reviews' : 'ok',
      reviewsAnalyzed: scan.analyzed,
      latestReviewDate: scan.latestReviewDate,
      recentRating: scan.recentRating,
      recentCount: scan.recentCount,
      topics: [],
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
    const topics = run?.ok ? aggregateFindings(snippets, run.output.findings, today) : aggregateUnverified(snippets, today);
    await upsertReviewCheck(deps.db, {
      hotelId: p.hotelId,
      status: verified ? 'ok' : 'skipped_budget',
      reviewsAnalyzed: p.scan.analyzed,
      latestReviewDate: p.scan.latestReviewDate,
      recentRating: p.scan.recentRating,
      recentCount: p.scan.recentCount,
      topics: topics.map(topicRow),
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

export const NO_REVIEW_DATA: ReviewDataWithChecks = { signals: new Map(), warnings: new Map(), status: new Map(), checks: new Map(), checked: new Map() };

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

/** Review checks of a search's hotels as scoring signals (stage 2), warnings and detail DTOs. */
export async function loadReviewData(db: Queryable, searchId: string, _chips: readonly string[]): Promise<ReviewDataWithChecks> {
  const signals = new Map<string, ReviewSignals | null>();
  const warnings = new Map<string, WarningDto[]>();
  const status = new Map<string, 'ok' | 'unverified'>();
  const checks = new Map<string, ReviewCheckDto>();
  const checked = new Map<string, number>();
  for (const check of await reviewChecksForSearch(db, searchId)) {
    if (check.status === 'failed') continue;
    if (check.status === 'ok' || check.status === 'skipped_budget') checked.set(check.hotelId, check.reviewsAnalyzed);
    const w = warningsOf(check);
    signals.set(check.hotelId, {
      recentRating: check.recentRating,
      recentCount: check.recentCount,
      cleanliness: cleanlinessOf(check),
      // Only confirmed warnings reduce the score; unverified hints never do.
      warnings: check.status === 'ok' ? check.topics.flatMap((t) => (t.confirmed_count > 0 && t.severity ? [{ topic: t.topic, severity: t.severity }] : [])) : [],
    });
    warnings.set(check.hotelId, w);
    if (check.status === 'ok') status.set(check.hotelId, 'ok');
    if (check.status === 'skipped_budget') status.set(check.hotelId, 'unverified');
    checks.set(check.hotelId, {
      status: check.status,
      ai_assisted: check.skillVersion !== null,
      reviews_checked: check.reviewsAnalyzed,
      recent_rating: check.recentRating,
      recent_count: check.recentCount,
      warnings: w,
      checked_at: check.checkedAt,
    });
  }
  return { signals, warnings, status, checks, checked };
}
