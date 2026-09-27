import { describe, expect, it } from 'vitest';
import {
  BOOKING_EVENTS,
  BOOKING_STATES,
  bookingRefFromBytes,
  cancellationPreview,
  decideComplete,
  nextBookingState,
  normalizeBookingRef,
  type BookingEvent,
  type BookingState,
} from '../src';

const allowed: Array<[BookingState, BookingEvent, BookingState]> = [
  ['draft', 'prebook_ok', 'prebooked'],
  ['draft', 'prebook_failed', 'failed'],
  ['prebooked', 'payment_returned', 'booking'],
  ['prebooked', 'payment_failed', 'failed'],
  ['booking', 'book_ok', 'confirmed'],
  ['booking', 'book_failed', 'failed'],
  ['confirmed', 'cancel_ok', 'cancelled'],
];

describe('booking state machine (architektur.md 6.11)', () => {
  it.each(allowed)('%s --%s--> %s', (from, event, to) => {
    expect(nextBookingState(from, event)).toBe(to);
  });

  it('forbids every other transition (only forward, terminal states stay)', () => {
    const forbidden = BOOKING_STATES.flatMap((s) => BOOKING_EVENTS.map((e) => [s, e] as const)).filter(
      ([s, e]) => !allowed.some(([from, event]) => from === s && event === e),
    );
    expect(forbidden).toHaveLength(BOOKING_STATES.length * BOOKING_EVENTS.length - allowed.length);
    for (const [s, e] of forbidden) expect(nextBookingState(s, e), `${s} --${e}`).toBeNull();
  });

  it('decides complete idempotently', () => {
    expect(decideComplete('confirmed', false, false)).toEqual({ action: 'return_confirmed' });
    expect(decideComplete('booking', false, false)).toEqual({ action: 'retry_later' });
    expect(decideComplete('prebooked', false, false)).toEqual({ action: 'book' });
    expect(decideComplete('prebooked', true, false)).toEqual({ action: 'confirm_price_first' });
    expect(decideComplete('prebooked', true, true)).toEqual({ action: 'book' });
    for (const s of ['draft', 'failed', 'cancelled'] as const) expect(decideComplete(s, false, false)).toEqual({ action: 'reject' });
  });

  it('previews cancellation costs from the policy', () => {
    const now = new Date('2026-09-27T10:00:00Z');
    expect(cancellationPreview({ refundable: true, freeCancelUntil: '2026-09-30T16:00:00Z' }, 21200, now)).toEqual({ kind: 'free', feeCents: 0, refundCents: 21200 });
    expect(cancellationPreview({ refundable: true, freeCancelUntil: '2026-09-20T16:00:00Z' }, 21200, now)).toEqual({ kind: 'fee_unknown', feeCents: null, refundCents: null });
    expect(cancellationPreview({ refundable: false, freeCancelUntil: null }, 21200, now)).toEqual({ kind: 'full', feeCents: 21200, refundCents: 0 });
    expect(cancellationPreview({ refundable: true, freeCancelUntil: null }, 21200, now).kind).toBe('free');
  });

  it('builds 8-character Crockford Base32 references and normalises input', () => {
    expect(bookingRefFromBytes(new Uint8Array([0, 0, 0, 0, 0]))).toBe('00000000');
    expect(bookingRefFromBytes(new Uint8Array([255, 255, 255, 255, 255]))).toBe('ZZZZZZZZ');
    for (let i = 0; i < 50; i += 1) {
      const ref = bookingRefFromBytes(new Uint8Array([i * 5, i * 7, i * 11, i * 13, i * 17]));
      expect(ref).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
    expect(normalizeBookingRef('k7m2-q9xz')).toBe('K7M2Q9XZ');
    expect(normalizeBookingRef('O1IL 2345')).toBe('01112345');
    expect(normalizeBookingRef('K7M2Q9X')).toBeNull();
    expect(normalizeBookingRef('K7M2Q9XU')).toBeNull();
  });
});
