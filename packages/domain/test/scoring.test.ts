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
    expect(list.map((e) => [e.offer.hotelId, e.offer.quality])).toEqual([
      ['B', 8.8],
      ['A', 7.6],
    ]);
  });

  it('example 3: 30 % below the median of its dates → date bargain with the text template', () => {
    const base = { hotelId: 'X', placeId: 'P', placeName: 'Ort', quality: 8 };
    const bargains = detectBargains([
      { ...base, id: '1', checkin: '2026-10-02', pricePerNightCents: 10_000 },
      { ...base, id: '2', checkin: '2026-10-09', pricePerNightCents: 10_000 },
      { ...base, id: '3', checkin: '2026-10-16', pricePerNightCents: 10_000 },
      { ...base, id: '4', checkin: '2026-10-23', pricePerNightCents: 7_000 },
    ]);
    expect(bargains.get('4')).toEqual({ types: ['date'], reason: '30 % günstiger als dieselbe Unterkunft an deinen anderen Terminen' });
    expect(bargains.size).toBe(1);
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
    // S0 = (200·8 + 50·7.5)/250 = 7.9; Δ = 1.5 → S1 = 7.9 + 0.5·1.5·10/20 = 8.275
    // S2 = 0.65·8.275 + 0.35·9 = 8.52875; penalty = 0.6·2 = 1.2 → 7.32875 → 7.3
    expect(s).toMatchObject({ s0: 7.9, recency: { applied: true, delta: 1.5, s1: 8.275 }, penalty: { total: 1.2 }, quality: 7.3 });
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
