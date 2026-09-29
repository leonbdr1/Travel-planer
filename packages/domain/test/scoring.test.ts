import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectBargains, median } from '../src/bargains';
import { NO_FILTERS, passesFilters } from '../src/filters';
import { buildMatrix, evaluateOffers, hotelList, type EvalHotel, type EvalOffer } from '../src/ranking';
import { qualityScore } from '../src/scoring';

interface Fixture {
  hotels: EvalHotel[];
  offers: EvalOffer[];
  combinations: Array<{ placeId: string; checkin: string; checkout: string; state: 'done' }>;
  expected: {
    quality: Record<string, number | null>;
    bargains: Record<string, { types: string[]; reason: string }>;
    list_best: Array<[string, string, number]>;
    list_price: string[];
    matrix: Array<[string, string, string, string | null, number | null]>;
  };
}
const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/scoring_case_1.json'), 'utf8')) as Fixture;
const hotels = new Map(fixture.hotels.map((h) => [h.id, h]));

describe('scoring_case_1.json (architektur.md 6.6–6.9)', () => {
  const evaluated = evaluateOffers(fixture.offers, hotels, NO_FILTERS);

  it('quality stage 1 per hotel', () => {
    const byHotel = Object.fromEntries(fixture.hotels.map((h) => [h.id, evaluated.find((o) => o.hotelId === h.id)?.quality ?? null]));
    expect(byHotel).toEqual(fixture.expected.quality);
    expect(evaluated.find((o) => o.hotelId === 'H4')?.breakdown.recency.checked).toBe(false);
  });

  it('bargains with reasons from the search itself', () => {
    const marked = Object.fromEntries(evaluated.filter((o) => o.bargain).map((o) => [o.id, o.bargain]));
    expect(marked).toEqual(fixture.expected.bargains);
  });

  it('list: every hotel once with its best offer and other dates', () => {
    expect(hotelList(evaluated, 'best').map((e) => [e.offer.hotelId, e.offer.id, e.otherDatesCount])).toEqual(fixture.expected.list_best);
    expect(hotelList(evaluated, 'price').map((e) => e.offer.hotelId)).toEqual(fixture.expected.list_price);
    expect(hotelList(evaluated, 'quality').map((e) => e.offer.hotelId)).toEqual(['H1', 'H5', 'H3', 'H2', 'H4']);
  });

  it('matrix: best offer per cell and price buckets 1–5', () => {
    const cells = buildMatrix(fixture.combinations, evaluated);
    expect(cells.map((c) => [c.placeId, c.checkin, c.state, c.offer?.id ?? null, c.priceBucket])).toEqual(fixture.expected.matrix);
  });
});

describe('acceptance examples (konzept.md 5.1)', () => {
  it('example 2: 9.0 from 400 reviews ranks before 5.0 from 3 reviews at the same price', () => {
    const a = { id: 'A', name: 'A', stars: 3, rating: 10, reviewCount: 3, hotelType: 'Hotel', facilityIds: [] };
    const b = { id: 'B', name: 'B', stars: 3, rating: 9, reviewCount: 400, hotelType: 'Hotel', facilityIds: [] };
    const offer = (id: string, hotelId: string): EvalOffer => ({
      ...(fixture.offers[0] as EvalOffer),
      id,
      hotelId,
      totalCents: 20_000,
      pricePerNightCents: 10_000,
    });
    const list = hotelList(evaluateOffers([offer('a', 'A'), offer('b', 'B')], new Map([['A', a], ['B', b]]), NO_FILTERS), 'best');
    // B counts fully (≥ 30 reviews); A is pulled towards 7.5 by the 27 missing: (3·10 + 27·7.5)/30 = 7.75.
    expect(list.map((e) => [e.offer.hotelId, e.offer.quality])).toEqual([
      ['B', 9],
      ['A', 7.8],
    ]);
  });

  const stay = { hotelId: 'X', placeId: 'P', placeName: 'Ort', quality: 8, roomName: 'Doppelzimmer', boardType: 'BB', refundable: true };

  it('example 3: 30 % below the median of its dates → date bargain with the text template', () => {
    const bargains = detectBargains([
      { ...stay, id: '1', checkin: '2026-10-02', pricePerNightCents: 10_000 },
      { ...stay, id: '2', checkin: '2026-10-09', pricePerNightCents: 10_000 },
      { ...stay, id: '3', checkin: '2026-10-16', pricePerNightCents: 10_000 },
      { ...stay, id: '4', checkin: '2026-10-23', pricePerNightCents: 7_000 },
    ]);
    expect(bargains.get('4')).toEqual({ types: ['date'], reason: '30 % günstiger als dieselbe Unterkunft an deinen anderen Terminen (gleiches Zimmer: hier 70 € pro Nacht, an deinen Terminen im Mittel 100 € pro Nacht)' });
    expect(bargains.size).toBe(1);
  });
});

describe('date bargains compare the same room (Ben, 2026-09-29)', () => {
  const stay = { hotelId: 'X', placeId: 'P', placeName: 'Ort', quality: 8, roomName: 'Doppelzimmer', boardType: 'BB', refundable: true };

  it('a double room free on one date is no bargain against the suite left on the others', () => {
    const bargains = detectBargains([
      { ...stay, id: '1', checkin: '2026-10-02', roomName: 'Suite', pricePerNightCents: 20_000 },
      { ...stay, id: '2', checkin: '2026-10-09', roomName: 'Suite', pricePerNightCents: 20_000 },
      { ...stay, id: '3', checkin: '2026-10-16', roomName: 'Suite', pricePerNightCents: 21_000 },
      { ...stay, id: '4', checkin: '2026-10-23', pricePerNightCents: 9_000 },
    ]);
    expect(bargains.size).toBe(0);
  });

  it('compares the room across its dates even when another room is the cheapest on some of them', () => {
    const bargains = detectBargains([
      { ...stay, id: '1', checkin: '2026-10-02', pricePerNightCents: 12_000 },
      { ...stay, id: '2', checkin: '2026-10-09', pricePerNightCents: 13_540 },
      { ...stay, id: '3', checkin: '2026-10-16', roomName: 'Suite', pricePerNightCents: 25_000 },
      { ...stay, id: '4', checkin: '2026-10-23', roomName: ' doppelzimmer ', pricePerNightCents: 9_000 },
    ]);
    // Doppelzimmer on three dates: 120 €, 135.40 €, 90 € → median 120 € → 25 % below.
    expect(bargains.get('4')).toEqual({
      types: ['date'],
      reason: '25 % günstiger als dieselbe Unterkunft an deinen anderen Terminen (gleiches Zimmer: hier 90 € pro Nacht, an deinen Terminen im Mittel 120 € pro Nacht)',
    });
    expect(bargains.size).toBe(1);
  });

  it('treats another board or other cancellation terms as another kind of stay', () => {
    const three = (patch: Partial<typeof stay>, prefix: string) =>
      ['2026-10-02', '2026-10-09', '2026-10-16'].map((checkin, i) => ({ ...stay, ...patch, id: `${prefix}${i}`, checkin, pricePerNightCents: 10_000 }));
    const cheapWithoutBreakfast = { ...stay, id: 'ro', checkin: '2026-10-23', boardType: 'RO', pricePerNightCents: 7_000 };
    const cheapNonRefundable = { ...stay, id: 'nr', checkin: '2026-10-23', refundable: false, pricePerNightCents: 7_000 };
    expect(detectBargains([...three({}, 'bb'), cheapWithoutBreakfast, cheapNonRefundable]).size).toBe(0);
    expect(detectBargains([...three({ boardType: 'RO' }, 'ro'), cheapWithoutBreakfast]).get('ro')?.types).toEqual(['date']);
  });
});

describe('scoring stage 2 and filters', () => {
  it('applies recency, cleanliness (chip sauber) and warning penalties with noise doubled for ruhig', () => {
    const s = qualityScore({
      rating: 8,
      reviewCount: 200,
      chips: ['sauber', 'ruhig'],
      review: { recentRating: 9.5, recentCount: 10, cleanliness: 9, warnings: [{ topic: 'laerm', severity: 'medium' }] },
    });
    // S0 = 8 (200 ≥ 30 reviews count fully); Δ = 1.5 → S1 = 8 + 0.5·1.5·10/20 = 8.375
    // S2 = 0.65·8.375 + 0.35·9 = 8.59375; penalty = 0.6·2 = 1.2 → 7.39375 → 7.4
    expect(s).toMatchObject({ s0: 8, recency: { applied: true, delta: 1.5, s1: 8.375 }, penalty: { total: 1.2 }, quality: 7.4 });
    expect(qualityScore({ rating: null, reviewCount: 10, review: null, chips: [] }).quality).toBeNull();
  });

  it('filters budget, stars, rating, reviews, refundable, board and chips', () => {
    const hotel = { stars: 3, rating: 8, reviewCount: 50, hotelType: 'Ferienwohnung', facilityIds: [2] };
    const offer = { totalCents: 30_000, refundable: false, boardType: 'RO' as const };
    const f = (patch: Partial<typeof NO_FILTERS>) => passesFilters(offer, hotel, { ...NO_FILTERS, ...patch });
    expect(f({})).toBe(true);
    expect(f({ budgetTotalCents: 29_999 })).toBe(false);
    expect(f({ minStars: 4 })).toBe(false);
    expect(f({ minRating: 8.5 })).toBe(false);
    expect(f({ minReviews: 51 })).toBe(false);
    expect(f({ refundableOnly: true })).toBe(false);
    expect(f({ board: 'BB' })).toBe(false);
    expect(f({ propertyTypes: ['Hotel'] })).toBe(false);
    expect(f({ chips: ['wlan'] })).toBe(true);
    expect(f({ chips: ['parkplatz'] })).toBe(false);
    expect(f({ chips: ['kueche'] })).toBe(true);
    expect(f({ chips: ['fruehstueck'] })).toBe(false);
    expect(median([3, 1, 2, 4])).toBe(2.5);
  });

  it('marks failed and pending combinations in the matrix', () => {
    const cells = buildMatrix(
      [
        { placeId: 'P', checkin: '2026-10-02', checkout: '2026-10-04', state: 'failed' },
        { placeId: 'P', checkin: '2026-10-09', checkout: '2026-10-11', state: 'pending' },
      ],
      [],
    );
    expect(cells.map((c) => c.state)).toEqual(['failed', 'pending']);
  });
});
