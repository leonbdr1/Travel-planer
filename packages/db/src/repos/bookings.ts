// Bookings and their state transitions (architektur.md 5.6, 6.11). Every
// transition locks the row (SELECT … FOR UPDATE) inside one transaction and
// is checked against the domain state machine. LiteAPI ids never leave the
// server; guest data can be erased while the record stays.
import { z } from 'zod';
import { isBookingState, nextBookingState, type BookingEvent, type BookingState } from '@reiseplaner/domain';
import { json, type Db, type Queryable } from '../db';

export const offerSnapshotSchema = z.object({
  offerRowId: z.string(),
  liteapiOfferId: z.string(),
  hotelName: z.string(),
  placeName: z.string(),
  roomName: z.string(),
  boardType: z.string(),
  refundable: z.boolean(),
  freeCancelUntil: z.string().nullable(),
  totalCents: z.number().int(),
  payAtPropertyCents: z.number().int(),
  payAtPropertyKnown: z.boolean(),
  nights: z.number().int(),
});
export type OfferSnapshot = z.infer<typeof offerSnapshotSchema>;

export const guestSchema = z.object({ room: z.number().int().min(1), firstName: z.string(), lastName: z.string() });
export type BookingGuest = z.infer<typeof guestSchema>;
const occupancySchema = z.array(z.object({ adults: z.number().int(), childrenAges: z.array(z.number().int()) }));
const cancellationPolicySchema = z.object({ refundable: z.boolean(), freeCancelUntil: z.string().nullable() });

export interface Booking {
  id: string;
  bookingRef: string;
  searchId: string | null;
  hotelId: string;
  offer: OfferSnapshot;
  status: BookingState;
  prebookId: string | null;
  transactionId: string | null;
  liteapiBookingId: string | null;
  hotelConfirmationCode: string | null;
  checkin: string;
  checkout: string;
  occupancy: z.infer<typeof occupancySchema>;
  totalCents: number;
  currency: string;
  priceChanged: boolean;
  priceConfirmedAt: string | null;
  cancellationPolicy: z.infer<typeof cancellationPolicySchema> | null;
  cancellationFeeCents: number | null;
  refundCents: number | null;
  holder: { firstName: string; lastName: string; email: string; phone: string | null } | null;
  guests: BookingGuest[] | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  piiDeletedAt: string | null;
  lastError: string | null;
}

type BookingDbRow = {
  id: string;
  booking_ref: string;
  search_id: string | null;
  hotel_id: string;
  offer_snapshot: unknown;
  status: string;
  liteapi_prebook_id: string | null;
  liteapi_transaction_id: string | null;
  liteapi_booking_id: string | null;
  hotel_confirmation_code: string | null;
  checkin: string;
  checkout: string;
  occupancy: unknown;
  total_price_cents: number;
  currency: string;
  price_changed: boolean;
  price_confirmed_at: string | null;
  cancellation_policy: unknown;
  cancellation_fee_cents: number | null;
  refund_cents: number | null;
  holder_first_name: string | null;
  holder_last_name: string | null;
  holder_email: string | null;
  holder_phone: string | null;
  guests: unknown;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  pii_deleted_at: string | null;
  last_error: string | null;
};

const ts = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ${column}`;
const COLUMNS = `id::text AS id, booking_ref, search_id::text AS search_id, hotel_id, offer_snapshot::text AS offer_snapshot, status,
  liteapi_prebook_id, liteapi_transaction_id, liteapi_booking_id, hotel_confirmation_code, checkin::text AS checkin, checkout::text AS checkout,
  occupancy::text AS occupancy, total_price_cents, currency, price_changed, ${ts('price_confirmed_at')}, cancellation_policy::text AS cancellation_policy,
  cancellation_fee_cents, refund_cents, holder_first_name, holder_last_name, holder_email, holder_phone, guests::text AS guests,
  ${ts('created_at')}, ${ts('confirmed_at')}, ${ts('cancelled_at')}, ${ts('pii_deleted_at')}, last_error`;

const parseJson = (value: unknown): unknown => (typeof value === 'string' ? (JSON.parse(value) as unknown) : value);

function toBooking(r: BookingDbRow): Booking {
  if (!isBookingState(r.status)) throw new Error(`unknown booking status ${r.status}`);
  return {
    id: r.id,
    bookingRef: r.booking_ref,
    searchId: r.search_id,
    hotelId: r.hotel_id,
    offer: offerSnapshotSchema.parse(parseJson(r.offer_snapshot)),
    status: r.status,
    prebookId: r.liteapi_prebook_id,
    transactionId: r.liteapi_transaction_id,
    liteapiBookingId: r.liteapi_booking_id,
    hotelConfirmationCode: r.hotel_confirmation_code,
    checkin: r.checkin,
    checkout: r.checkout,
    occupancy: occupancySchema.parse(parseJson(r.occupancy)),
    totalCents: Number(r.total_price_cents),
    currency: r.currency.trim(),
    priceChanged: r.price_changed,
    priceConfirmedAt: r.price_confirmed_at,
    cancellationPolicy: r.cancellation_policy === null ? null : cancellationPolicySchema.parse(parseJson(r.cancellation_policy)),
    cancellationFeeCents: r.cancellation_fee_cents === null ? null : Number(r.cancellation_fee_cents),
    refundCents: r.refund_cents === null ? null : Number(r.refund_cents),
    holder:
      r.holder_first_name !== null && r.holder_last_name !== null && r.holder_email !== null
        ? { firstName: r.holder_first_name, lastName: r.holder_last_name, email: r.holder_email, phone: r.holder_phone }
        : null,
    guests: r.guests === null ? null : z.array(guestSchema).parse(parseJson(r.guests)),
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at,
    cancelledAt: r.cancelled_at,
    piiDeletedAt: r.pii_deleted_at,
    lastError: r.last_error,
  };
}

export interface NewBooking {
  searchId: string | null;
  hotelId: string;
  offer: OfferSnapshot;
  checkin: string;
  checkout: string;
  occupancy: Booking['occupancy'];
  totalCents: number;
  currency: string;
  cancellationPolicy: { refundable: boolean; freeCancelUntil: string | null };
  holder: { firstName: string; lastName: string; email: string; phone: string | null };
  guests: BookingGuest[];
}

/** Inserts a draft; a colliding reference (unique violation) is retried with the next candidate. */
export async function createBookingDraft(db: Queryable, b: NewBooking, nextRef: () => string, attempts = 5): Promise<{ id: string; bookingRef: string }> {
  for (let i = 0; i < attempts; i += 1) {
    const ref = nextRef();
    try {
      const rows = await db.query<{ id: string }>(
        `INSERT INTO app.bookings (booking_ref, search_id, hotel_id, offer_snapshot, checkin, checkout, occupancy, total_price_cents, currency,
                                   cancellation_policy, holder_first_name, holder_last_name, holder_email, holder_phone, guests)
         VALUES ($1, $2::uuid, $3, $4::text::jsonb, $5::date, $6::date, $7::text::jsonb, $8, $9, $10::text::jsonb, $11, $12, $13, $14, $15::text::jsonb)
         RETURNING id::text AS id`,
        [
          ref,
          b.searchId,
          b.hotelId,
          json(offerSnapshotSchema.parse(b.offer)),
          b.checkin,
          b.checkout,
          json(b.occupancy),
          b.totalCents,
          b.currency,
          json(b.cancellationPolicy),
          b.holder.firstName,
          b.holder.lastName,
          b.holder.email,
          b.holder.phone,
          json(b.guests),
        ],
      );
      const id = rows[0]?.id;
      if (id) return { id, bookingRef: ref };
    } catch (err) {
      if (!/booking_ref|23505|duplicate/i.test(String((err as Error).message))) throw err;
    }
  }
  throw new Error('could not allocate a booking reference');
}

export async function getBookingByRef(db: Queryable, ref: string): Promise<Booking | null> {
  const rows = await db.query<BookingDbRow>(`SELECT ${COLUMNS} FROM app.bookings WHERE booking_ref = $1`, [ref]);
  return rows[0] ? toBooking(rows[0]) : null;
}

export async function getBookingById(db: Queryable, id: string): Promise<Booking | null> {
  const rows = await db.query<BookingDbRow>(`SELECT ${COLUMNS} FROM app.bookings WHERE id = $1::uuid`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

/** Fields a transition may set besides the status. */
export interface BookingPatch {
  prebookId?: string;
  transactionId?: string;
  totalCents?: number;
  currency?: string;
  priceChanged?: boolean;
  liteapiBookingId?: string;
  hotelConfirmationCode?: string | null;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationFeeCents?: number | null;
  refundCents?: number | null;
  lastError?: string | null;
}

export type TransitionResult = { ok: true; booking: Booking } | { ok: false; state: BookingState | null };

/**
 * Applies a state-machine event in one transaction: locks the row, checks the
 * transition, writes the new status and the patch. Returns the current state
 * when the event is not allowed.
 */
export async function applyBookingEvent(db: Db, id: string, event: BookingEvent, patch: BookingPatch = {}): Promise<TransitionResult> {
  return db.transaction(async (tx) => {
    const locked = await tx.query<{ status: string }>('SELECT status FROM app.bookings WHERE id = $1::uuid FOR UPDATE', [id]);
    const current = locked[0]?.status;
    if (current === undefined || !isBookingState(current)) return { ok: false, state: null };
    const next = nextBookingState(current, event);
    if (next === null) return { ok: false, state: current };
    const rows = await tx.query<BookingDbRow>(
      `UPDATE app.bookings SET
         status = $2,
         liteapi_prebook_id = coalesce($3, liteapi_prebook_id),
         liteapi_transaction_id = coalesce($4, liteapi_transaction_id),
         total_price_cents = coalesce($5, total_price_cents),
         currency = coalesce($6, currency),
         price_changed = coalesce($7, price_changed),
         liteapi_booking_id = coalesce($8, liteapi_booking_id),
         hotel_confirmation_code = CASE WHEN $9::boolean THEN $10 ELSE hotel_confirmation_code END,
         confirmed_at = coalesce($11::timestamptz, confirmed_at),
         cancelled_at = coalesce($12::timestamptz, cancelled_at),
         cancellation_fee_cents = CASE WHEN $13::boolean THEN $14 ELSE cancellation_fee_cents END,
         refund_cents = CASE WHEN $15::boolean THEN $16 ELSE refund_cents END,
         last_error = CASE WHEN $17::boolean THEN left($18, 200) ELSE last_error END,
         updated_at = now()
       WHERE id = $1::uuid
       RETURNING ${COLUMNS}`,
      [
        id,
        next,
        patch.prebookId ?? null,
        patch.transactionId ?? null,
        patch.totalCents ?? null,
        patch.currency ?? null,
        patch.priceChanged ?? null,
        patch.liteapiBookingId ?? null,
        patch.hotelConfirmationCode !== undefined,
        patch.hotelConfirmationCode ?? null,
        patch.confirmedAt ? patch.confirmedAt.toISOString() : null,
        patch.cancelledAt ? patch.cancelledAt.toISOString() : null,
        patch.cancellationFeeCents !== undefined,
        patch.cancellationFeeCents ?? null,
        patch.refundCents !== undefined,
        patch.refundCents ?? null,
        patch.lastError !== undefined,
        patch.lastError ?? null,
      ],
    );
    const row = rows[0];
    return row ? { ok: true, booking: toBooking(row) } : { ok: false, state: current };
  });
}

/** Confirms a changed price (prebooked only); returns false in any other state. */
export async function confirmBookingPrice(db: Queryable, id: string, now: Date): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    `UPDATE app.bookings SET price_confirmed_at = $2::timestamptz, updated_at = now()
      WHERE id = $1::uuid AND status = 'prebooked' RETURNING id::text AS id`,
    [id, now.toISOString()],
  );
  return rows.length === 1;
}

/** Confirmed bookings in the last `days` days per rate request (architektur.md 5.7). */
export async function lookToBookRatio(db: Queryable, days: number): Promise<number> {
  const rows = await db.query<{ ratio: number }>('SELECT app.look_to_book_ratio($1)::float8 AS ratio', [days]);
  return Number(rows[0]?.ratio ?? 0);
}
