// E-mail outbox (architektur.md 5.6, 6.12): every e-mail is written here
// first, sent at once when possible and retried by the cron job with
// backoff, at most EMAIL_MAX_ATTEMPTS times. Secrets in the payload (links
// with access tokens) are removed once the e-mail is sent or given up.
import { z } from 'zod';
import { json, type Queryable } from '../db';

export const EMAIL_TYPES = ['booking_confirmation', 'booking_cancelled', 'access_link', 'review_invite', 'ops_alert'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export interface OutboxEmail {
  id: string;
  type: EmailType;
  toEmail: string;
  bookingId: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

type OutboxDbRow = { id: string; type: string; to_email: string; booking_id: string | null; payload: unknown; attempts: number };

const payloadSchema = z.record(z.string(), z.unknown());

function toEmail(r: OutboxDbRow): OutboxEmail {
  const type = z.enum(EMAIL_TYPES).parse(r.type);
  return {
    id: String(r.id),
    type,
    toEmail: r.to_email,
    bookingId: r.booking_id,
    payload: payloadSchema.parse(typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload),
    attempts: Number(r.attempts),
  };
}

export async function enqueueEmail(
  db: Queryable,
  e: { type: EmailType; toEmail: string; bookingId: string | null; payload: Record<string, unknown> },
): Promise<OutboxEmail> {
  const rows = await db.query<OutboxDbRow>(
    `INSERT INTO app.email_outbox (type, to_email, booking_id, payload) VALUES ($1, $2, $3::uuid, $4::text::jsonb)
     RETURNING id::text AS id, type, to_email, booking_id::text AS booking_id, payload::text AS payload, attempts`,
    [e.type, e.toEmail, e.bookingId, json(e.payload)],
  );
  const row = rows[0];
  if (!row) throw new Error('outbox insert failed');
  return toEmail(row);
}

/** Pending e-mails whose next attempt is due. */
export async function dueEmails(db: Queryable, now: Date, limit: number): Promise<OutboxEmail[]> {
  const rows = await db.query<OutboxDbRow>(
    `SELECT id::text AS id, type, to_email, booking_id::text AS booking_id, payload::text AS payload, attempts
       FROM app.email_outbox WHERE status = 'pending' AND next_attempt_at <= $1::timestamptz ORDER BY id LIMIT $2`,
    [now.toISOString(), limit],
  );
  return rows.map(toEmail);
}

export async function getOutboxEmail(db: Queryable, id: string): Promise<(OutboxEmail & { status: string; lastError: string | null; providerMessageId: string | null }) | null> {
  const rows = await db.query<OutboxDbRow & { status: string; last_error: string | null; provider_message_id: string | null }>(
    `SELECT id::text AS id, type, to_email, booking_id::text AS booking_id, payload::text AS payload, attempts, status, last_error, provider_message_id
       FROM app.email_outbox WHERE id = $1::bigint`,
    [id],
  );
  const row = rows[0];
  return row ? { ...toEmail(row), status: row.status, lastError: row.last_error, providerMessageId: row.provider_message_id } : null;
}

/** Keys removed from the payload once an e-mail is final (sent or given up). */
export const SECRET_PAYLOAD_KEYS = ['accessUrl'] as const;

export async function markEmailSent(db: Queryable, id: string, providerMessageId: string, now: Date): Promise<void> {
  await db.query(
    `UPDATE app.email_outbox SET status = 'sent', provider_message_id = $2, sent_at = $3::timestamptz, attempts = attempts + 1,
            last_error = NULL, payload = payload - $4::text[]
      WHERE id = $1::bigint AND status = 'pending'`,
    [id, providerMessageId, now.toISOString(), SECRET_PAYLOAD_KEYS],
  );
}

/** Counts a failed attempt; after `maxAttempts` the e-mail is marked failed. */
export async function markEmailAttemptFailed(db: Queryable, id: string, error: string, nextAttemptAt: Date, maxAttempts: number): Promise<'pending' | 'failed'> {
  const rows = await db.query<{ status: string }>(
    `UPDATE app.email_outbox SET attempts = attempts + 1, last_error = left($2, 200), next_attempt_at = $3::timestamptz,
            status = CASE WHEN attempts + 1 >= $4 THEN 'failed' ELSE 'pending' END,
            payload = CASE WHEN attempts + 1 >= $4 THEN payload - $5::text[] ELSE payload END
      WHERE id = $1::bigint AND status = 'pending' RETURNING status`,
    [id, error, nextAttemptAt.toISOString(), maxAttempts, SECRET_PAYLOAD_KEYS],
  );
  return rows[0]?.status === 'failed' ? 'failed' : 'pending';
}

export interface OutboxStatusRow {
  type: EmailType;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

/** The e-mails of one booking with their delivery state, oldest first (support tool). */
export async function outboxForBooking(db: Queryable, bookingId: string): Promise<OutboxStatusRow[]> {
  const rows = await db.query<{ type: string; status: string; attempts: number; last_error: string | null; created_at: string; sent_at: string | null }>(
    `SELECT type, status, attempts, last_error,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            to_char(sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS sent_at
       FROM app.email_outbox WHERE booking_id = $1::uuid ORDER BY id`,
    [bookingId],
  );
  return rows.map((r) => ({
    type: z.enum(EMAIL_TYPES).parse(r.type),
    status: z.enum(['pending', 'sent', 'failed']).parse(r.status),
    attempts: Number(r.attempts),
    lastError: r.last_error,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));
}
