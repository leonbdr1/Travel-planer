// Review checks per hotel and the transient keyword snippets between the
// workflow steps reviews-fetch and reviews-verify (architektur.md 6.10,
// migrations 20261007a and 20261011a). No review texts in review_checks, only
// counts; pending snippets are deleted once verified.
import { z } from 'zod';
import { json, type Queryable } from '../db';

export type ReviewCheckStatus = 'ok' | 'no_reviews' | 'skipped_budget' | 'failed';

const severity = z.enum(['low', 'medium', 'high']);
export const reviewTopicRowSchema = z.object({
  topic: z.string(),
  confirmed_count: z.number().int().min(0),
  unverified_count: z.number().int().min(0),
  recent_count: z.number().int().min(0),
  latest_date: z.string().nullable(),
  severity: severity.nullable(),
});
export type ReviewTopicRow = z.infer<typeof reviewTopicRowSchema>;
/** Praise and criticism per praise topic (konzept.md 9.11). */
export const praiseRowSchema = z.object({
  topic: z.string(),
  praised: z.number().int().min(0),
  criticized: z.number().int().min(0),
  // Weighted counts (recent reviews count more); absent in rows written before.
  praisedWeighted: z.number().min(0).optional(),
  criticizedWeighted: z.number().min(0).optional(),
  reviewsWeighted: z.number().min(0).optional(),
});
export type PraiseRow = z.infer<typeof praiseRowSchema>;
const sentimentSchema = z.array(z.object({ name: z.string(), rating: z.number() })).nullable();

export interface ReviewCheck {
  hotelId: string;
  status: ReviewCheckStatus;
  reviewsAnalyzed: number;
  latestReviewDate: string | null;
  recentRating: number | null;
  recentCount: number;
  topics: ReviewTopicRow[];
  praise: PraiseRow[];
  sentiment: Array<{ name: string; rating: number }> | null;
  skillVersion: string | null;
  checkedAt: string;
  expiresAt: string;
}

// A type alias (not an interface) so it satisfies the query's Row constraint.
type ReviewCheckDbRow = {
  hotel_id: string;
  status: ReviewCheckStatus;
  reviews_analyzed: number;
  latest_review_date: string | null;
  recent_rating: number | null;
  recent_count: number;
  topics: unknown;
  praise: unknown;
  liteapi_sentiment: unknown;
  skill_version: string | null;
  checked_at: string;
  expires_at: string;
};

const CHECK_COLUMNS = `hotel_id, status, reviews_analyzed, latest_review_date::text AS latest_review_date, recent_rating::float8 AS recent_rating,
  recent_count, topics::text AS topics, praise::text AS praise, liteapi_sentiment::text AS liteapi_sentiment, skill_version,
  to_char(checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS checked_at,
  to_char(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS expires_at`;

const parseJsonColumn = (value: unknown): unknown => (typeof value === 'string' ? (JSON.parse(value) as unknown) : value);

function toCheck(r: ReviewCheckDbRow): ReviewCheck {
  return {
    hotelId: r.hotel_id,
    status: r.status,
    reviewsAnalyzed: Number(r.reviews_analyzed),
    latestReviewDate: r.latest_review_date,
    recentRating: r.recent_rating === null ? null : Number(r.recent_rating),
    recentCount: Number(r.recent_count),
    topics: z.array(reviewTopicRowSchema).parse(parseJsonColumn(r.topics)),
    praise: z.array(praiseRowSchema).parse(parseJsonColumn(r.praise)),
    sentiment: sentimentSchema.parse(r.liteapi_sentiment === null ? null : parseJsonColumn(r.liteapi_sentiment)),
    skillVersion: r.skill_version,
    checkedAt: r.checked_at,
    expiresAt: r.expires_at,
  };
}

/** Checks of the given hotels; with `validAt` only those not yet expired. */
export async function getReviewChecks(db: Queryable, hotelIds: readonly string[], validAt?: Date): Promise<ReviewCheck[]> {
  if (hotelIds.length === 0) return [];
  const rows = await db.query<ReviewCheckDbRow>(
    `SELECT ${CHECK_COLUMNS} FROM app.review_checks
      WHERE hotel_id = ANY($1::text[]) AND ($2::timestamptz IS NULL OR expires_at > $2::timestamptz)
      ORDER BY hotel_id`,
    [hotelIds, validAt ? validAt.toISOString() : null],
  );
  return rows.map(toCheck);
}

/** Checks of all hotels that have offers in the search (for results and detail). */
export async function reviewChecksForSearch(db: Queryable, searchId: string): Promise<ReviewCheck[]> {
  const rows = await db.query<ReviewCheckDbRow>(
    `SELECT ${CHECK_COLUMNS} FROM app.review_checks
      WHERE hotel_id IN (SELECT DISTINCT hotel_id FROM app.offers WHERE search_id = $1::uuid)
      ORDER BY hotel_id`,
    [searchId],
  );
  return rows.map(toCheck);
}

export interface ReviewCheckWrite {
  hotelId: string;
  status: ReviewCheckStatus;
  reviewsAnalyzed: number;
  latestReviewDate: string | null;
  recentRating: number | null;
  recentCount: number;
  topics: ReviewTopicRow[];
  praise: PraiseRow[];
  sentiment: Array<{ name: string; rating: number }> | null;
  skillVersion: string | null;
  checkedAt: Date;
  expiresAt: Date;
}

export async function upsertReviewCheck(db: Queryable, c: ReviewCheckWrite): Promise<void> {
  await db.query(
    `INSERT INTO app.review_checks (hotel_id, status, reviews_analyzed, latest_review_date, recent_rating, recent_count, topics,
                                    liteapi_sentiment, skill_version, checked_at, expires_at, praise)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7::text::jsonb, $8::text::jsonb, $9, $10::timestamptz, $11::timestamptz, $12::text::jsonb)
     ON CONFLICT (hotel_id) DO UPDATE SET
       status = EXCLUDED.status, reviews_analyzed = EXCLUDED.reviews_analyzed, latest_review_date = EXCLUDED.latest_review_date,
       recent_rating = EXCLUDED.recent_rating, recent_count = EXCLUDED.recent_count, topics = EXCLUDED.topics,
       liteapi_sentiment = EXCLUDED.liteapi_sentiment, skill_version = EXCLUDED.skill_version,
       checked_at = EXCLUDED.checked_at, expires_at = EXCLUDED.expires_at, praise = EXCLUDED.praise`,
    [
      c.hotelId,
      c.status,
      c.reviewsAnalyzed,
      c.latestReviewDate,
      c.recentRating,
      c.recentCount,
      json(z.array(reviewTopicRowSchema).parse(c.topics)),
      c.sentiment === null ? null : json(c.sentiment),
      c.skillVersion,
      c.checkedAt.toISOString(),
      c.expiresAt.toISOString(),
      json(z.array(praiseRowSchema).parse(c.praise)),
    ],
  );
}

export const pendingSnippetSchema = z.object({
  id: z.string(),
  topicHint: z.string(),
  date: z.string(),
  lang: z.string(),
  text: z.string(),
  negated: z.boolean(),
  keyword: z.string(),
  reviewRef: z.string(),
});
export type PendingSnippet = z.infer<typeof pendingSnippetSchema>;
export const pendingScanSchema = z.object({
  analyzed: z.number().int(),
  latestReviewDate: z.string().nullable(),
  recentRating: z.number().nullable(),
  recentCount: z.number().int(),
  sentiment: sentimentSchema,
  // Rows written before 20261011a have no praise counts.
  praise: z.array(praiseRowSchema).default([]),
});
export type PendingScan = z.infer<typeof pendingScanSchema>;

export async function putPendingReview(
  db: Queryable,
  p: { searchId: string; hotelId: string; scan: PendingScan; snippets: readonly PendingSnippet[]; expiresAt: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO app.review_check_pending (search_id, hotel_id, scan, snippets, expires_at)
     VALUES ($1::uuid, $2, $3::text::jsonb, $4::text::jsonb, $5::timestamptz)
     ON CONFLICT (search_id, hotel_id) DO NOTHING`,
    [p.searchId, p.hotelId, json(p.scan), json(p.snippets), p.expiresAt.toISOString()],
  );
}

export async function pendingReviewHotels(db: Queryable, searchId: string): Promise<string[]> {
  const rows = await db.query<{ hotel_id: string }>('SELECT hotel_id FROM app.review_check_pending WHERE search_id = $1::uuid', [searchId]);
  return rows.map((r) => r.hotel_id);
}

export async function listPendingReviews(
  db: Queryable,
  searchId: string,
): Promise<Array<{ hotelId: string; hotelName: string; scan: PendingScan; snippets: PendingSnippet[] }>> {
  const rows = await db.query<{ hotel_id: string; name: string; scan: unknown; snippets: unknown }>(
    `SELECT p.hotel_id, h.name, p.scan::text AS scan, p.snippets::text AS snippets
       FROM app.review_check_pending p JOIN app.hotels h ON h.id = p.hotel_id
      WHERE p.search_id = $1::uuid ORDER BY p.created_at, p.hotel_id`,
    [searchId],
  );
  return rows.map((r) => ({
    hotelId: r.hotel_id,
    hotelName: r.name,
    scan: pendingScanSchema.parse(parseJsonColumn(r.scan)),
    snippets: z.array(pendingSnippetSchema).parse(parseJsonColumn(r.snippets)),
  }));
}

export async function deletePendingReview(db: Queryable, searchId: string, hotelId: string): Promise<void> {
  await db.query('DELETE FROM app.review_check_pending WHERE search_id = $1::uuid AND hotel_id = $2', [searchId, hotelId]);
}
