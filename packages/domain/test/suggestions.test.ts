import { describe, expect, it } from 'vitest';
import { candidatePlaces, rankPlaces, rankRegions, reachablePlaces, type CatalogPlace } from '../src/suggestions';
import { formatDuration, formatList, regionReason } from '../src/texts';
import { fitsThemes, matchingThemes, themeScore } from '../src/themes';

const stuttgart = { lat: 48.7823, lng: 9.177 };
const place = (id: string, region: string, lat: number, lng: number, themes: Record<string, number>): CatalogPlace => ({
  id,
  name: id,
  regionId: region,
  regionName: region === 'allgaeu' ? 'Allgäu' : region === 'schwarzwald' ? 'Schwarzwald' : 'Rügen',
  lat,
  lng,
  themes,
});
const places = [
  place('Oberstdorf', 'allgaeu', 47.41, 10.28, { wandern: 3, bergpanorama: 3 }),
  place('Füssen', 'allgaeu', 47.57, 10.7, { seen: 3, wandern: 2 }),
  place('Sonthofen', 'allgaeu', 47.52, 10.28, { wandern: 1, radfahren: 2 }),
  place('Baiersbronn', 'schwarzwald', 48.5, 8.37, { wandern: 3, wein_kulinarik: 3 }),
  place('Todtnau', 'schwarzwald', 47.83, 7.95, { wandern: 2 }),
  place('Binz', 'ruegen', 54.4, 13.61, { wandern: 2 }),
];
const labels: Record<string, string> = { wandern: 'Wandern', seen: 'Seen' };

describe('themes', () => {
  it('matches with minimum strength 2 and sums strengths', () => {
    expect(matchingThemes({ wandern: 1, seen: 3 }, ['wandern', 'seen'])).toEqual(['seen']);
    expect(fitsThemes({ wandern: 1 }, ['wandern'])).toBe(false);
    expect(fitsThemes({ wandern: 1 }, [])).toBe(true);
    expect(themeScore({ wandern: 3, seen: 2 }, ['wandern'])).toBe(3);
    expect(themeScore({ wandern: 3, seen: 2 }, [])).toBe(5);
  });
});

describe('suggestions (architektur.md 6.2)', () => {
  it('candidates: theme strength ≥ 2 and straight-line prefilter', () => {
    const ids = candidatePlaces(places, stuttgart, ['wandern'], 180).map((p) => p.id);
    expect(ids).toEqual(['Oberstdorf', 'Füssen', 'Baiersbronn', 'Todtnau']);
    expect(candidatePlaces(places, stuttgart, ['wandern'], null).map((p) => p.id)).toContain('Binz');
  });

  it('ranks regions with a reason and filters by drive time', () => {
    const times = new Map([
      ['Oberstdorf', { minutes: 170, estimated: false }],
      ['Füssen', { minutes: 150, estimated: false }],
      ['Baiersbronn', { minutes: 75, estimated: false }],
      ['Todtnau', { minutes: 190, estimated: false }],
    ]);
    const reachable = reachablePlaces(candidatePlaces(places, stuttgart, ['wandern'], 180), times, 180);
    expect(reachable.map((r) => r.place.id)).toEqual(['Oberstdorf', 'Füssen', 'Baiersbronn']);
    const regions = rankRegions(reachable, ['wandern'], (c) => labels[c] ?? c);
    expect(regions.map((r) => [r.name, r.score, r.places])).toEqual([
      ['Allgäu', 5, 2],
      ['Schwarzwald', 3, 1],
    ]);
    expect(regions[0]?.reason).toBe('2 passende Orte für Wandern, 2 h 30 min–2 h 50 min Fahrt');
    expect(regions[1]?.reason).toBe('1 passender Ort für Wandern, 1 h 15 min Fahrt');
  });

  it('ranks places by theme score, then drive time, and marks estimates', () => {
    const reachable = [
      { place: places[1]!, minutes: 150, estimated: false },
      { place: places[0]!, minutes: 170, estimated: true },
    ];
    const ranked = rankPlaces(reachable, ['wandern', 'seen']);
    expect(ranked.map((r) => [r.place.id, r.score, r.matchedThemes])).toEqual([
      ['Füssen', 5, ['wandern', 'seen']],
      ['Oberstdorf', 3, ['wandern']],
    ]);
    const regions = rankRegions(reachable, ['wandern'], (c) => labels[c] ?? c);
    expect(regions[0]?.reason).toContain('geschätzt');
  });
});

describe('texts', () => {
  it('formats durations and lists in German', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatList(['Wandern'])).toBe('Wandern');
    expect(formatList(['Wandern', 'Seen', 'Wellness'])).toBe('Wandern, Seen und Wellness');
    expect(regionReason({ places: 3, themeLabels: [], minMinutes: 60, maxMinutes: 60, estimated: false })).toBe('3 passende Orte, 1 h Fahrt');
  });
});
