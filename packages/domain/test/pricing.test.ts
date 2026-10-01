import { describe, expect, it } from 'vitest';
import { findEquivalentOption, freeCancellationAt, freeCancelUntil, normalizedRating, normalizeOffers } from '../src/pricing';
import type { RateOption } from '../src/types';

const option = (id: string, totalCents: number, refundable: boolean, extra: Partial<RateOption> = {}): RateOption => ({
  offerId: id,
  roomName: `Zimmer ${id}`,
  boardType: 'RO',
  boardName: null,
  totalCents,
  currency: 'EUR',
  suggestedSellingCents: null,
  taxes: [],
  refundable,
  cancelPolicy: refundable ? [{ from: '2026-10-01T22:00:00Z', penaltyCents: totalCents, currency: 'EUR' }] : [],
  maxOccupancy: 2,
  ...extra,
});

describe('normalizeOffers (architektur.md 6.5)', () => {
  it('keeps the cheapest and the cheapest refundable offer per hotel', () => {
    const offers = normalizeOffers(
      [{ hotelId: 'h1', options: [option('b', 25_000, true), option('a', 21_200, false), option('c', 30_000, true)] }],
      2,
    );
    expect(offers.map((o) => [o.kind, o.offerId, o.totalCents, o.pricePerNightCents])).toEqual([
      ['cheapest', 'a', 21_200, 10_600],
      ['cheapest_refundable', 'b', 25_000, 12_500],
    ]);
    expect(offers[1]?.freeCancelUntil).toBe('2026-10-01T22:00:00Z');
  });

  it('emits one offer when the cheapest is refundable, skips hotels without prices', () => {
    const offers = normalizeOffers(
      [
        { hotelId: 'h1', options: [option('a', 20_000, true), option('b', 22_000, false)] },
        { hotelId: 'h2', options: [] },
        { hotelId: 'h3', options: [option('x', 0, false)] },
      ],
      3,
    );
    expect(offers.map((o) => [o.hotelId, o.kind])).toEqual([['h1', 'cheapest']]);
    expect(offers[0]?.pricePerNightCents).toBe(6_667);
  });

  it('sums taxes paid at the property and marks missing tax data as unknown', () => {
    const withTaxes = option('t', 20_000, false, {
      taxes: [
        { amountCents: 640, currency: 'EUR', included: false, description: 'Kurtaxe' },
        { amountCents: 1_500, currency: 'EUR', included: true, description: 'MwSt.' },
      ],
    });
    const [known] = normalizeOffers([{ hotelId: 'h', options: [withTaxes] }], 2);
    expect(known).toMatchObject({ payAtPropertyCents: 640, payAtPropertyKnown: true });
    const [unknown] = normalizeOffers([{ hotelId: 'h', options: [option('u', 20_000, false, { taxes: null })] }], 2);
    expect(unknown).toMatchObject({ payAtPropertyCents: 0, payAtPropertyKnown: false });
  });

  it('derives the end of free cancellation from the first penalty step', () => {
    expect(
      freeCancelUntil({
        refundable: true,
        cancelPolicy: [
          { from: '2026-10-05T10:00:00Z', penaltyCents: 100, currency: 'EUR' },
          { from: '2026-10-01T10:00:00Z', penaltyCents: 50, currency: 'EUR' },
        ],
      }),
    ).toBe('2026-10-01T10:00:00Z');
    expect(freeCancelUntil({ refundable: false, cancelPolicy: [] })).toBeNull();
  });

  it('normalizes ratings to 0–10', () => {
    expect(normalizedRating({ rating: 4.3, ratingScale: 5 })).toBe(8.6);
    expect(normalizedRating({ rating: 8.64, ratingScale: 10 })).toBe(8.64);
    expect(normalizedRating({ rating: null, ratingScale: 10 })).toBeNull();
  });
});

describe('findEquivalentOption', () => {
  const room = { roomName: 'Doppelzimmer', boardType: 'BB' as const, refundable: true };
  const opt = (id: string, cents: number, extra: Partial<RateOption> = {}) => option(id, cents, true, { roomName: 'Doppelzimmer', boardType: 'BB', ...extra });

  it('takes the cheapest option with the same room, board and cancellation kind', () => {
    const found = findEquivalentOption([opt('b', 25_000), opt('a', 21_000), opt('c', 19_000, { roomName: 'Einzelzimmer' })], room);
    expect(found?.offerId).toBe('a');
  });

  it('never substitutes a different board or a non-refundable tariff', () => {
    expect(findEquivalentOption([opt('a', 20_000, { boardType: 'RO' }), option('n', 15_000, false, { roomName: 'Doppelzimmer', boardType: 'BB' })], room)).toBeNull();
  });

  it('is null when the tariff is gone', () => {
    expect(findEquivalentOption([], room)).toBeNull();
  });
});

describe('freeCancellationAt', () => {
  const now = new Date('2026-10-01T08:00:00Z');

  it('keeps free cancellation until its deadline and drops it afterwards', () => {
    expect(freeCancellationAt({ refundable: true, freeCancelUntil: '2026-10-05T16:00:00Z' }, now)).toEqual({ refundable: true, freeCancelUntil: '2026-10-05T16:00:00Z' });
    // The deadline passed (e.g. results opened days later): no longer free, from now on the fees of the tariff apply.
    expect(freeCancellationAt({ refundable: true, freeCancelUntil: '2026-09-30T16:00:00Z' }, now)).toEqual({ refundable: false, freeCancelUntil: null });
    expect(freeCancellationAt({ refundable: true, freeCancelUntil: null }, now)).toEqual({ refundable: true, freeCancelUntil: null });
    expect(freeCancellationAt({ refundable: false, freeCancelUntil: null }, now)).toEqual({ refundable: false, freeCancelUntil: null });
  });
});
