import { describe, expect, it } from 'vitest';
import { continentOf, CONTINENT_CODES, estimateFlightMinutes, isFlightDistanceKm } from '../src/destinations';
import { qualityGate, requiredScore } from '../src/destination-quality';
import { rankRegions, type CatalogPlace, type ReachablePlace } from '../src/suggestions';

const munich = { lat: 48.14, lng: 11.58 };

describe('required attractiveness grows with the distance (F19)', () => {
  it('hiking within four hours is not picky, further out it is', () => {
    expect(requiredScore({ mode: 'car', minutes: 120, matchedThemes: ['wandern'] })).toBe(0);
    expect(requiredScore({ mode: 'car', minutes: 240, matchedThemes: ['wandern'] })).toBe(0);
    expect(requiredScore({ mode: 'car', minutes: 360, matchedThemes: ['wandern'] })).toBeGreaterThan(0);
    expect(requiredScore({ mode: 'car', minutes: 900, matchedThemes: ['wandern'] })).toBeGreaterThan(requiredScore({ mode: 'car', minutes: 360, matchedThemes: ['wandern'] }));
  });

  it('a beach, culture or shopping trip is picky earlier than a hike', () => {
    const hike = requiredScore({ mode: 'car', minutes: 150, matchedThemes: ['wandern'] });
    const beach = requiredScore({ mode: 'car', minutes: 150, matchedThemes: ['strand'] });
    expect(beach).toBeGreaterThan(hike);
    // A place that also fits a relaxed theme is judged by that theme.
    expect(requiredScore({ mode: 'car', minutes: 150, matchedThemes: ['strand', 'wandern'] })).toBe(hike);
  });

  it('a flight only leads to top destinations, whatever the theme', () => {
    expect(requiredScore({ mode: 'flight', minutes: 120, matchedThemes: ['wandern'] })).toBe(requiredScore({ mode: 'flight', minutes: 600, matchedThemes: ['strand'] }));
    expect(requiredScore({ mode: 'flight', minutes: 120, matchedThemes: [] })).toBeGreaterThanOrEqual(8);
  });
});

const p = (id: string, region: string, score: number, themes: Record<string, number> = { strand: 3 }): CatalogPlace & { attractivenessScore: number } => ({
  id,
  name: id,
  regionId: region,
  regionName: region,
  lat: 0,
  lng: 0,
  themes,
  attractivenessScore: score,
});
const reach = (place: CatalogPlace & { attractivenessScore: number }, minutes: number): ReachablePlace<typeof place> => ({ place, minutes, estimated: false });

describe('quality gate', () => {
  it('drops regions without a hotspot and keeps slightly lesser places of a hotspot region', () => {
    const all = [
      reach(p('Vernazza', 'cinque', 9.1), 400),
      reach(p('Levanto', 'cinque', 7.4), 400),
      reach(p('Hinterland-Ort', 'cinque', 3), 400),
      reach(p('Nebenort', 'ruhig', 5.5), 400),
    ];
    const ids = qualityGate(all, ['strand'], 'car').map((r) => r.place.id);
    expect(ids).toEqual(['Vernazza', 'Levanto']);
  });

  it('keeps everything close by for hiking', () => {
    const all = [reach(p('A', 'r1', 2, { wandern: 3 }), 90), reach(p('B', 'r2', 4.2, { wandern: 2 }), 200)];
    expect(qualityGate(all, ['wandern'], 'car')).toHaveLength(2);
  });

  it('leaves places of a search without theme choice to the distance only', () => {
    const all = [reach(p('A', 'r1', 2, { wandern: 3 }), 90)];
    expect(qualityGate(all, [], 'car')).toHaveLength(1);
  });

  it('a place without a score is not filtered', () => {
    const plain: CatalogPlace = { id: 'x', name: 'x', regionId: 'r', regionName: 'r', lat: 0, lng: 0, themes: { wandern: 3 } };
    expect(qualityGate([{ place: plain, minutes: 900, estimated: true }], ['wandern'], 'car')).toHaveLength(1);
  });
});

describe('ranking by quality', () => {
  it('ranks a hotspot region above a larger region of lesser places when asked to', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((n) => reach(p(n, 'gross', 6.5), 300));
    const top = [reach(p('Top', 'klein', 9.2), 300)];
    const byThemes = rankRegions([...many, ...top], ['strand'], (c) => c);
    expect(byThemes[0]?.regionId).toBe('gross');
    const byQuality = rankRegions([...many, ...top], ['strand'], (c) => c, 5, 'quality');
    expect(byQuality[0]?.regionId).toBe('klein');
  });
});

describe('continents and flight time', () => {
  it('knows the continent of every catalog country', () => {
    expect(continentOf('ES')).toBe('europa');
    expect(continentOf('IT-BZ')).toBe('europa');
    expect(continentOf('NO')).toBe('europa');
    expect(CONTINENT_CODES).toContain('asien');
  });

  it('estimates flight time from the distance', () => {
    const lisbon = { lat: 38.72, lng: -9.14 };
    const minutes = estimateFlightMinutes(munich, lisbon);
    expect(minutes).toBeGreaterThan(150);
    expect(minutes).toBeLessThan(240);
    expect(isFlightDistanceKm(150)).toBe(false);
    expect(isFlightDistanceKm(900)).toBe(true);
  });
});
