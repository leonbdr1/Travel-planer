import { describe, expect, it } from 'vitest';
import { CHIPS } from '../src/chips';
import { offerFeatures } from '../src/features';
import { NO_FILTERS, passesFilters } from '../src/filters';

// Aufgabe F20 (Ben, 30.09.): pool, air conditioning and sea view are wish chips
// that filter hard, and positive labels on every house that has them.
const offer = { totalCents: 30000, boardType: 'BB', refundable: true } as const;
const hotel = (facilityIds: number[]) => ({ stars: 4, rating: 8.5, reviewCount: 100, hotelType: 'Hotel', facilityIds });
const withChip = (chip: string) => ({ ...NO_FILTERS, chips: [chip] });

describe('pool, klimaanlage, meerblick as wish chips', () => {
  it('are offered as chips', () => {
    expect(CHIPS.map((c) => c.code)).toEqual(expect.arrayContaining(['pool', 'klimaanlage', 'meerblick']));
  });

  it('filter hard: houses without the facility drop out', () => {
    expect(passesFilters(offer, hotel([1, 2]), withChip('pool'))).toBe(false);
    expect(passesFilters(offer, hotel([1, 24]), withChip('pool'))).toBe(true);
    expect(passesFilters(offer, hotel([18]), withChip('pool'))).toBe(true);
    expect(passesFilters(offer, hotel([1]), withChip('klimaanlage'))).toBe(false);
    expect(passesFilters(offer, hotel([25]), withChip('klimaanlage'))).toBe(true);
    expect(passesFilters(offer, hotel([1, 25]), withChip('meerblick'))).toBe(false);
    expect(passesFilters(offer, hotel([26]), withChip('meerblick'))).toBe(true);
  });

  it('without a chip nothing is filtered', () => {
    expect(passesFilters(offer, hotel([]), NO_FILTERS)).toBe(true);
  });

  it('show as positive labels whether or not a chip was ticked', () => {
    const codes = (ids: number[]) => offerFeatures(hotel(ids), offer).map((f) => f.code);
    expect(codes([25, 26, 24])).toEqual(expect.arrayContaining(['klimaanlage', 'meerblick', 'schwimmbad']));
    expect(codes([1, 2])).not.toEqual(expect.arrayContaining(['klimaanlage']));
    expect(codes([1, 2])).not.toEqual(expect.arrayContaining(['meerblick']));
  });
});
