// Hotels, guesthouses and holiday flats judged fairly (Aufgaben 6 und 7,
// docs/logik/unterkunftsarten.md).
import { describe, expect, it } from 'vitest';
import { comparisonBonus, hasManyReviews } from '../src/comparison';
import { hasRedFlag } from '../src/preselect';
import { propertyKind } from '../src/property-kind';
import { qualityScore } from '../src/scoring';

describe('propertyKind', () => {
  it('uses the provider type first, else the name, else hotel', () => {
    expect(propertyKind('Ferienwohnung', 'Haus Alpenblick')).toBe('ferienwohnung');
    expect(propertyKind('Apartments', 'Seeblick')).toBe('ferienwohnung');
    expect(propertyKind('Holiday home', 'Chalet Rose')).toBe('ferienwohnung');
    expect(propertyKind('Guest house', 'Haus Maria')).toBe('pension');
    expect(propertyKind('Bed and breakfast', 'Rosi')).toBe('pension');
    expect(propertyKind('Hotel', 'Pension Waldesruh')).toBe('hotel');
    expect(propertyKind(null, 'Pension Waldesruh')).toBe('pension');
    expect(propertyKind(null, 'Gasthof Adler')).toBe('pension');
    expect(propertyKind(null, 'Ferienwohnung 2 „Die Kleine“')).toBe('ferienwohnung');
    expect(propertyKind(null, 'Apartments Bachhaus')).toBe('ferienwohnung');
    expect(propertyKind(null, 'Landhotel Bären')).toBe('hotel');
    expect(propertyKind(null, 'Zum Hirschen')).toBe('hotel');
  });
});

describe('few reviews count fairly by kind (Aufgabe 6)', () => {
  const score = (kind: 'hotel' | 'pension' | 'ferienwohnung') => qualityScore({ rating: 8.7, reviewCount: 17, review: null, chips: [], kind });

  it("Ben's example: 8.7 from 17 reviews is pulled only a little for a holiday flat", () => {
    // Hotel: (17 × 8.7 + 13 × 7.5) / 30 = 8.18; pension (…+ 8 × 7.5) / 25 = 8.32; flat (… + 3 × 7.5) / 20 = 8.52.
    expect(score('hotel')).toMatchObject({ s0: 8.18, quality: 8.2, fullWeightReviews: 30, propertyKind: 'hotel' });
    expect(score('pension')).toMatchObject({ s0: 8.316, quality: 8.3, fullWeightReviews: 25 });
    expect(score('ferienwohnung')).toMatchObject({ s0: 8.52, quality: 8.5, fullWeightReviews: 20 });
  });

  it('a holiday flat from 20 reviews counts like a hotel from 30', () => {
    expect(qualityScore({ rating: 9, reviewCount: 20, review: null, chips: [], kind: 'ferienwohnung' }).quality).toBe(9);
    expect(qualityScore({ rating: 9, reviewCount: 30, review: null, chips: [] }).quality).toBe(9);
  });

  it('many reviews is relative to the kind', () => {
    expect(hasManyReviews(80, 'ferienwohnung')).toBe(true);
    expect(hasManyReviews(80, 'hotel')).toBe(false);
    expect(hasManyReviews(500, 'hotel')).toBe(true);
    expect(comparisonBonus({ totalCents: 20_000, quality: null, reviews: 80, extras: 0, kind: 'ferienwohnung' }, 'sparen')).toBeGreaterThan(0);
  });
});

describe('defects bound to a unit weigh by kind (Aufgabe 6)', () => {
  const review = { recentRating: null, recentCount: 0, cleanliness: null, warnings: [{ topic: 'schimmel', severity: 'high' as const }] };
  const penalty = (kind: 'hotel' | 'pension' | 'ferienwohnung') =>
    qualityScore({ rating: 9, reviewCount: 200, review, chips: [], kind }).penalty.total;

  it('mould costs a hotel less and a holiday flat more than a guesthouse', () => {
    expect(penalty('hotel')).toBe(0.6);
    expect(penalty('pension')).toBe(1);
    expect(penalty('ferienwohnung')).toBe(1.6);
    // Noise is not bound to a unit: the same everywhere.
    const noise = { ...review, warnings: [{ topic: 'laerm', severity: 'high' as const }] };
    expect(qualityScore({ rating: 9, reviewCount: 200, review: noise, chips: [], kind: 'ferienwohnung' }).penalty.total).toBe(1);
  });

  it('a holiday flat may lose up to 3 points, a hotel up to 2', () => {
    const many = { ...review, warnings: ['schimmel', 'ungeziefer', 'sauberkeit'].map((topic) => ({ topic, severity: 'high' as const })) };
    expect(qualityScore({ rating: 9, reviewCount: 200, review: many, chips: [], kind: 'ferienwohnung' }).penalty.total).toBe(3);
    expect(qualityScore({ rating: 9, reviewCount: 200, review: many, chips: [], kind: 'hotel' }).penalty.total).toBe(1.8);
  });

  it('two mould reports among few reviews take a holiday flat out, not a hotel', () => {
    const evidence = {
      checked: true,
      labels: [],
      warnings: [{ topic: 'schimmel', confirmed: 2, unverified: 0, guests: 2, share: 0.06 }],
    };
    expect(hasRedFlag(evidence, 'ferienwohnung')).toBe(true);
    expect(hasRedFlag(evidence, 'pension')).toBe(false);
    expect(hasRedFlag(evidence, 'hotel')).toBe(false);
    expect(hasRedFlag(evidence)).toBe(false);
  });
});
