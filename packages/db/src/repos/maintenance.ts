// Maintenance jobs (architektur.md 6.12): expired caches, retention periods
// (searches, IP hashes, guest data after checkout, old outbox rows) and the
// due review invitations. Every statement is idempotent.
import type { Queryable } from '../db';

export interface CleanupCounts {
  cacheEntries: number;
  rateLimits: number;
  reviewChecks: number;
  reviewPending: number;
  travelTimes: number;
}

async function count(db: Queryable, sql: string, params: readonly (string | number)[]): Promise<number> {
  const rows = await db.query<{ n: number }>(`WITH d AS (${sql} RETURNING 1) SELECT count(*)::int AS n FROM d`, params);
  return Number(rows[0]?.n ?? 0);
}

/** Hourly: remove everything whose lifetime is over. */
export async function deleteExpired(db: Queryable, now: Date, travelTimeTtlDays: number): Promise<CleanupCounts> {
  const at = now.toISOString();
  return {
    cacheEntries: await count(db, 'DELETE FROM app.cache_entries WHERE expires_at < $1::timestamptz', [at]),
    rateLimits: await count(db, 'DELETE FROM app.rate_limits WHERE reset_at < $1::timestamptz', [at]),
    reviewChecks: await count(db, 'DELETE FROM app.review_checks WHERE expires_at < $1::timestamptz', [at]),
    reviewPending: await count(db, 'DELETE FROM app.review_check_pending WHERE expires_at < $1::timestamptz', [at]),
    travelTimes: await count(db, "DELETE FROM app.travel_time_cache WHERE fetched_at < $1::timestamptz - make_interval(days => $2)", [at, travelTimeTtlDays]),
  };
}

export interface RetentionCounts {
  searchesDeleted: number;
  ipHashesCleared: number;
  guestDataErased: number;
  outboxDeleted: number;
}

/** Daily: retention periods from product.config.yaml (compliance.retention). */
export async function applyRetention(
  db: Queryable,
  now: Date,
  r: { searchesDays: number; ipHashDays: number; guestDataDaysAfterCheckout: number },
): Promise<RetentionCounts> {
  const at = now.toISOString();
  return {
    searchesDeleted: await count(db, 'DELETE FROM app.searches WHERE created_at < $1::timestamptz - make_interval(days => $2)', [at, r.searchesDays]),
    ipHashesCleared: await count(
      db,
      'UPDATE app.searches SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < $1::timestamptz - make_interval(days => $2)',
      [at, r.ipHashDays],
    ),
    guestDataErased: await count(
      db,
      `UPDATE app.bookings SET holder_first_name = NULL, holder_last_name = NULL, holder_email = NULL, holder_phone = NULL, guests = NULL,
              pii_deleted_at = $1::timestamptz, updated_at = now()
        WHERE pii_deleted_at IS NULL AND checkout < ($1::timestamptz AT TIME ZONE 'UTC')::date - $2::int`,
      [at, r.guestDataDaysAfterCheckout],
    ),
    outboxDeleted: await count(db, 'DELETE FROM app.email_outbox WHERE created_at < $1::timestamptz - make_interval(days => $2)', [at, r.guestDataDaysAfterCheckout]),
  };
}

export interface DueInvite {
  bookingId: string;
  bookingRef: string;
  email: string;
  hotelName: string;
  checkout: string;
}

/** Confirmed stays that ended at least a day ago (and at most `maxDelayDays` ago) without an invitation. */
export async function dueReviewInvites(db: Queryable, today: string, maxDelayDays: number): Promise<DueInvite[]> {
  const rows = await db.query<{ id: string; booking_ref: string; holder_email: string; hotel_name: string; checkout: string }>(
    `SELECT id::text AS id, booking_ref, holder_email, offer_snapshot->>'hotelName' AS hotel_name, checkout::text AS checkout
       FROM app.bookings
      WHERE status = 'confirmed' AND review_invite_sent_at IS NULL AND pii_deleted_at IS NULL AND holder_email IS NOT NULL
        AND checkout < $1::date AND checkout >= $1::date - $2::int
      ORDER BY checkout, id`,
    [today, maxDelayDays],
  );
  return rows.map((r) => ({ bookingId: r.id, bookingRef: r.booking_ref, email: r.holder_email, hotelName: r.hotel_name, checkout: r.checkout }));
}

export async function markReviewInviteSent(db: Queryable, bookingId: string, now: Date): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    'UPDATE app.bookings SET review_invite_sent_at = $2::timestamptz WHERE id = $1::uuid AND review_invite_sent_at IS NULL RETURNING id::text AS id',
    [bookingId, now.toISOString()],
  );
  return rows.length === 1;
}
