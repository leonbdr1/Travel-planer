// Rooms mapped to the party (Aufgabe 5, docs/logik/zimmer-und-personen.md).
import { describe, expect, it } from 'vitest';
import { normalizeOffers } from '../src/pricing';
import { comfortRoomPrice, roomCapacity, roomFit } from '../src/rooms';
import type { RateOption } from '../src/types';

const option = (id: string, roomName: string, totalCents: number, maxOccupancy: number | null, refundable = true): RateOption => ({
  offerId: id,
  roomName,
  boardType: 'RO',
  boardName: null,
  totalCents,
  currency: 'EUR',
  suggestedSellingCents: null,
  taxes: [],
  refundable,
  cancelPolicy: [],
  maxOccupancy,
});

describe('roomCapacity', () => {
  it('takes the provider occupancy first, else the room name', () => {
    expect(roomCapacity('Ferienwohnung', 6)).toBe(6);
    expect(roomCapacity('Ferienwohnung für 6 Personen', null)).toBe(6);
    expect(roomCapacity('Apartment (bis zu 5 Personen)', null)).toBe(5);
    expect(roomCapacity('Haus 8 Pers.', null)).toBe(8);
    expect(roomCapacity('4-Bett-Zimmer', null)).toBe(4);
    expect(roomCapacity('Einzelzimmer Economy', null)).toBe(1);
    expect(roomCapacity('Doppelzimmer Komfort', null)).toBe(2);
    expect(roomCapacity('Family Room', null)).toBe(4);
    expect(roomCapacity('Ferienwohnung 2 „Die Kleine“', null)).toBeNull();
  });
});

describe('roomFit', () => {
  it('a room up to two places bigger than the party fits, a bigger one is more than needed', () => {
    expect(roomFit(2, 2)).toBe('fits');
    expect(roomFit(4, 2)).toBe('fits');
    expect(roomFit(5, 2)).toBe('oversized');
    expect(roomFit(6, 4)).toBe('fits');
    expect(roomFit(null, 2)).toBe('fits');
  });
});

describe('normalizeOffers with the party (Aufgabe 5)', () => {
  it('chooses cheapest and cheapest refundable among the fitting rooms only and lists every room', () => {
    const [cheapest, refundable, ...rest] = normalizeOffers(
      [
        {
          hotelId: 'h',
          options: [
            option('fam', 'Ferienwohnung für 6 Personen', 15_000, 6, false),
            option('dz', 'Doppelzimmer', 18_000, 2, false),
            option('dzb', 'Doppelzimmer mit Balkon', 21_000, 2, true),
            option('dz2', 'Doppelzimmer', 19_000, 2, true),
          ],
        },
      ],
      2,
      2,
    );
    expect(rest).toEqual([]);
    expect(cheapest).toMatchObject({ kind: 'cheapest', offerId: 'dz', roomFit: 'fits', roomCapacity: 2 });
    expect(refundable).toMatchObject({ kind: 'cheapest_refundable', offerId: 'dz2', roomFit: 'fits' });
    // The room list: every room once with its cheapest offer, the big flat marked.
    expect(cheapest?.roomOptions).toEqual([
      { roomName: 'Doppelzimmer', totalCents: 18_000, capacity: 2, fit: 'fits' },
      { roomName: 'Doppelzimmer mit Balkon', totalCents: 21_000, capacity: 2, fit: 'fits' },
      { roomName: 'Ferienwohnung für 6 Personen', totalCents: 15_000, capacity: 6, fit: 'oversized' },
    ]);
    expect(refundable?.roomOptions).toEqual([]);
  });

  it('keeps the cheapest oversized offer when no room fits, marked for display only', () => {
    const offers = normalizeOffers([{ hotelId: 'h', options: [option('big', 'Chalet', 30_000, 8), option('big2', 'Chalet XL', 40_000, 10)] }], 2, 2);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ kind: 'cheapest', offerId: 'big', roomFit: 'oversized' });
  });

  it('without a party every room counts as before', () => {
    const offers = normalizeOffers([{ hotelId: 'h', options: [option('fam', 'Ferienwohnung', 15_000, 6), option('dz', 'Doppelzimmer', 18_000, 2)] }], 2);
    expect(offers[0]).toMatchObject({ offerId: 'fam', roomFit: 'fits' });
  });
});

describe('comfortRoomPrice (prepared for "Komfort", not wired)', () => {
  it('weighs the other fitting rooms in: half the cheapest, half the median of all fitting rooms', () => {
    const rooms = [
      { roomName: 'DZ', totalCents: 20_000, capacity: 2, fit: 'fits' as const },
      { roomName: 'DZ Balkon', totalCents: 24_000, capacity: 2, fit: 'fits' as const },
      { roomName: 'Suite', totalCents: 40_000, capacity: 2, fit: 'fits' as const },
      { roomName: 'Chalet', totalCents: 10_000, capacity: 8, fit: 'oversized' as const },
    ];
    // 0.5 × 200 € + 0.5 × 240 € = 220 €
    expect(comfortRoomPrice(rooms)).toBe(22_000);
    expect(comfortRoomPrice([])).toBeNull();
  });
});
