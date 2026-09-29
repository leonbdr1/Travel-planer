// Simulated world for the decision aid (S11.2, konzept.md 9.9–9.11): the
// strengths of a hotel show up as praise labels through the real review path
// (fake LiteAPI → adapter → praise count), weaker hotels get none, and some
// places have a run-down 4-star house at a budget price with complaints.
import { describe, expect, it } from 'vitest';
import { countPraise, praiseLabels, scanReviews } from '@reiseplaner/domain';
import { createProviders, type ProvidersConfig } from '../src';
import { generateDoubtfulListing, generateFallenHotel, hasDoubtfulListing, hasFallenHotel, hotelById, hotelCountAt, hotelsAt, strengthsOf } from '../src/fake/world';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const now = () => new Date('2026-09-28T08:00:00Z');
const today = '2026-09-28';
const providers = createProviders(config, { now, sleep: async () => undefined });
// Füssen, Schwangau, Pfronten, Nesselwang, Oberstdorf.
const ANCHORS: Array<[number, number]> = [
  [47.57, 10.7],
  [47.58, 10.74],
  [47.58, 10.55],
  [47.62, 10.5],
  [47.41, 10.28],
];

async function labelsOf(hotelId: string) {
  const { reviews } = await providers.liteapi.getReviews(hotelId, { limit: 100, withSentiment: false });
  const warnings = new Set(scanReviews(reviews, today).snippets.filter((s) => !s.negated).map((s) => s.topicHint));
  return praiseLabels(countPraise(reviews, today), warnings);
}

describe('praise in the simulated world', () => {
  it('turns the strengths of well-reviewed hotels without problems into exactly these labels', async () => {
    let compared = 0;
    for (const [lat, lng] of ANCHORS) {
      for (const hotel of hotelsAt(lat, lng)) {
        if (hotel.issue !== 'none' || hotel.reviewCount < 60) continue;
        expect(new Set(await labelsOf(hotel.id)), hotel.name).toEqual(new Set(strengthsOf(hotel)));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(10);
  });

  it('never shows a label without a strength, and better-rated hotels have more strengths', async () => {
    const byRating: Array<[number, number]> = [];
    for (const [lat, lng] of ANCHORS) {
      for (const hotel of hotelsAt(lat, lng)) {
        const strengths = new Set(strengthsOf(hotel));
        for (const label of await labelsOf(hotel.id)) expect(strengths.has(label), `${hotel.name}: ${label}`).toBe(true);
        if (hotel.rating !== null && hotel.reviewCount >= 8) byRating.push([hotel.rating, strengths.size]);
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
    const top = byRating.filter(([r]) => r >= 8.8).map(([, n]) => n);
    const low = byRating.filter(([r]) => r < 7.2).map(([, n]) => n);
    expect(mean(top)).toBeGreaterThan(mean(low));
    expect(low.every((n) => n === 0)).toBe(true);
  });
});

describe('run-down 4-star houses (star trap)', () => {
  const anchors = Array.from({ length: 10 }, (_, i) => 4750 + i).flatMap((latE2) => Array.from({ length: 20 }, (_, j) => [latE2, 1060 + j] as const));

  it('stand at some places, cheaper than any regular 4-star house, and resolve by id', () => {
    const fallen = anchors.filter(([latE2, lngE2]) => hasFallenHotel(latE2, lngE2));
    expect(fallen.length / anchors.length).toBeGreaterThan(0.25);
    expect(fallen.length / anchors.length).toBeLessThan(0.55);
    for (const [latE2, lngE2] of fallen.slice(0, 20)) {
      const hotels = hotelsAt(latE2 / 100, lngE2 / 100);
      const count = hotelCountAt(latE2, lngE2);
      expect(hotels).toHaveLength(count + 1 + (hasDoubtfulListing(latE2, lngE2) ? 1 : 0));
      const house = hotels[count];
      expect(house).toEqual(generateFallenHotel(latE2, lngE2, count));
      expect(house?.stars).toBe(4);
      expect(house?.issue === 'condition' || house?.issue === 'dirty').toBe(true);
      expect(hotelById(house?.id ?? '')).toEqual(house);
      for (const other of hotels.slice(0, count)) {
        const hotelLike = other.kind !== 'Apartments' && other.kind !== 'Ferienwohnung';
        if (other.stars === 4 && hotelLike) expect(house?.basePerNightCents).toBeLessThan(other.basePerNightCents);
      }
    }
    const [latE2, lngE2] = anchors.find(([a, b]) => !hasFallenHotel(a, b) && !hasDoubtfulListing(a, b)) ?? [0, 0];
    expect(hotelById(`lpf-${latE2}-${lngE2}-${hotelCountAt(latE2, lngE2)}`)).toBeNull();
  });

  it('adds a listing without reviews that looks too good at some places, after the regular and the run-down house', () => {
    const doubtful = anchors.filter(([latE2, lngE2]) => hasDoubtfulListing(latE2, lngE2));
    expect(doubtful.length / anchors.length).toBeGreaterThan(0.35);
    expect(doubtful.length / anchors.length).toBeLessThan(0.65);
    for (const [latE2, lngE2] of doubtful.slice(0, 20)) {
      const hotels = hotelsAt(latE2 / 100, lngE2 / 100);
      const index = hotelCountAt(latE2, lngE2) + (hasFallenHotel(latE2, lngE2) ? 1 : 0);
      expect(hotels).toHaveLength(index + 1);
      const house = hotels[index];
      expect(house).toEqual(generateDoubtfulListing(latE2, lngE2, index));
      expect(house).toMatchObject({ rating: null, reviewCount: 0, stars: null });
      expect(house?.facilityIds).toEqual(expect.arrayContaining([4, 18]));
      expect(hotelById(house?.id ?? '')).toEqual(house);
      const flats = hotels.filter((h) => h !== house && h.kind === 'Ferienwohnung' && h.rating !== null);
      for (const flat of flats) expect(house?.basePerNightCents).toBeLessThan(flat.basePerNightCents);
    }
    // The regular houses of a place do not change.
    const [latE2, lngE2] = doubtful[0] ?? [0, 0];
    expect(hotelsAt(latE2 / 100, lngE2 / 100).slice(0, hotelCountAt(latE2, lngE2))).toEqual(
      Array.from({ length: hotelCountAt(latE2, lngE2) }, (_, i) => hotelById(`lpf-${latE2}-${lngE2}-${i}`)),
    );
  });

  it('collect complaints about wear or dirt in recent reviews', async () => {
    const [latE2, lngE2] = anchors.find(([a, b]) => hasFallenHotel(a, b)) ?? [0, 0];
    const house = generateFallenHotel(latE2, lngE2, hotelCountAt(latE2, lngE2));
    const { reviews } = await providers.liteapi.getReviews(house.id, { limit: 100, withSentiment: false });
    const topics = new Set(scanReviews(reviews, today).snippets.filter((s) => !s.negated).map((s) => s.topicHint));
    expect(topics.has(house.issue === 'condition' ? 'zustand' : 'sauberkeit')).toBe(true);
    expect(await labelsOf(house.id)).toEqual([]);
  });
});
