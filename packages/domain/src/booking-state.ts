// Booking state machine (architektur.md 6.11). Transitions only move
// forward; each runs in one transaction with SELECT … FOR UPDATE.
//
//   draft ──prebook_ok──▶ prebooked ──payment_returned──▶ booking ──book_ok──▶ confirmed ──cancel_ok──▶ cancelled
//     │                      │                               │
//     └─prebook_failed───────┴─payment_failed──▶ failed ◀────┴─book_failed
import { BOOKING_REF_LENGTH } from './constants';
import type { IsoTimestamp } from './types';

export const BOOKING_STATES = ['draft', 'prebooked', 'booking', 'confirmed', 'failed', 'cancelled'] as const;
export type BookingState = (typeof BOOKING_STATES)[number];

export const BOOKING_EVENTS = ['prebook_ok', 'prebook_failed', 'payment_returned', 'payment_failed', 'book_ok', 'book_failed', 'cancel_ok'] as const;
export type BookingEvent = (typeof BOOKING_EVENTS)[number];

const TRANSITIONS: Record<BookingState, Partial<Record<BookingEvent, BookingState>>> = {
  draft: { prebook_ok: 'prebooked', prebook_failed: 'failed' },
  prebooked: { payment_returned: 'booking', payment_failed: 'failed' },
  booking: { book_ok: 'confirmed', book_failed: 'failed' },
  confirmed: { cancel_ok: 'cancelled' },
  failed: {},
  cancelled: {},
};

/** The next state, or null when the event is not allowed in this state. */
export function nextBookingState(state: BookingState, event: BookingEvent): BookingState | null {
  return TRANSITIONS[state][event] ?? null;
}

export function isBookingState(value: string): value is BookingState {
  return (BOOKING_STATES as readonly string[]).includes(value);
}

export type CompleteDecision =
  | { action: 'book' }
  | { action: 'return_confirmed' }
  | { action: 'retry_later' }
  | { action: 'confirm_price_first' }
  | { action: 'reject' };

/**
 * What `complete` does in a given state (idempotent): `confirmed` returns the
 * stored result, `booking` asks the client to retry (a call to /rates/book
 * is running), `prebooked` books unless a changed price still waits for
 * confirmation; everything else is rejected.
 */
export function decideComplete(state: BookingState, priceChanged: boolean, priceConfirmed: boolean): CompleteDecision {
  if (state === 'confirmed') return { action: 'return_confirmed' };
  if (state === 'booking') return { action: 'retry_later' };
  if (state === 'prebooked') return priceChanged && !priceConfirmed ? { action: 'confirm_price_first' } : { action: 'book' };
  return { action: 'reject' };
}

export type CancellationPreview =
  | { kind: 'free'; feeCents: 0; refundCents: number }
  | { kind: 'full'; feeCents: number; refundCents: 0 }
  | { kind: 'fee_unknown'; feeCents: null; refundCents: null };

/** Cost of cancelling now, from the rate's policy (refundable, end of free cancellation). */
export function cancellationPreview(
  policy: { refundable: boolean; freeCancelUntil: IsoTimestamp | null },
  totalCents: number,
  now: Date,
): CancellationPreview {
  if (!policy.refundable) return { kind: 'full', feeCents: totalCents, refundCents: 0 };
  if (policy.freeCancelUntil === null || now.getTime() < Date.parse(policy.freeCancelUntil)) {
    return { kind: 'free', feeCents: 0, refundCents: totalCents };
  }
  return { kind: 'fee_unknown', feeCents: null, refundCents: null };
}

/** Crockford Base32 without I, L, O and U. */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Booking reference of BOOKING_REF_LENGTH characters from 5 random bits each (caller passes the randomness). */
export function bookingRefFromBytes(bytes: Uint8Array): string {
  const bitsNeeded = BOOKING_REF_LENGTH * 5;
  if (bytes.length * 8 < bitsNeeded) throw new Error(`need ${Math.ceil(bitsNeeded / 8)} random bytes`);
  let out = '';
  for (let i = 0; i < BOOKING_REF_LENGTH; i += 1) {
    let value = 0;
    for (let b = 0; b < 5; b += 1) {
      const bit = i * 5 + b;
      value = (value << 1) | (((bytes[Math.floor(bit / 8)] ?? 0) >> (7 - (bit % 8))) & 1);
    }
    out += CROCKFORD_ALPHABET[value];
  }
  return out;
}

/** Normalises user input of a booking reference (case, O→0, I/L→1, spaces and hyphens). */
export function normalizeBookingRef(input: string): string | null {
  const ref = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return new RegExp(`^[${CROCKFORD_ALPHABET}]{${BOOKING_REF_LENGTH}}$`).test(ref) ? ref : null;
}
