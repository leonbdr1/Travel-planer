// Attractiveness of places and regions (Aufgabe 8, docs/logik/orts-attraktivitaet.md).
import { describe, expect, it } from 'vitest';
import { attractivenessOf, catalogAttractiveness, regionAttractiveness, userPlaceAttractiveness } from '../src/attractiveness';

describe('catalogAttractiveness', () => {
  it('a famous mountain resort is a top place', () => {
    const oberstdorf = catalogAttractiveness({
      fame: 3,
      attractions: 3,
      themes: { wandern: 3, bergpanorama: 3, wintersport: 3, wellness: 2, familie: 2 },
      population: 9_700,
    });
    expect(oberstdorf).toMatchObject({ score: 10, level: 'top', parts: { fame: 3, attractions: 3, trails: 3, variety: 3, infrastructure: 3 } });
  });

  it('a quiet side village is marked "wenig"', () => {
    const village = catalogAttractiveness({ fame: 1, attractions: 0, themes: { natur_ruhe: 2 }, population: 900 });
    // (2·1 + 0 + 1.5·0 + 1·1 + 1·1) / 22.5 × 10 = 1.8
    expect(village).toMatchObject({ score: 1.8, level: 'wenig' });
  });

  it('missing curation counts as a popular place without major sights', () => {
    expect(catalogAttractiveness({ fame: null, attractions: null, themes: { wandern: 2, seen: 2 }, population: 3_000 }).parts).toMatchObject({ fame: 2, attractions: 1 });
  });
});

describe('userPlaceAttractiveness', () => {
  it('a metropolis is a top place, a city a popular one', () => {
    expect(userPlaceAttractiveness({ population: 1_000_000, neighbour: null }).level).toBe('top');
    expect(userPlaceAttractiveness({ population: 150_000, neighbour: null }).level).toBe('beliebt');
  });

  it('a small village far from any catalog place has little to offer', () => {
    expect(userPlaceAttractiveness({ population: 800, neighbour: null })).toMatchObject({ level: 'wenig', parts: { fame: 1, attractions: 0, trails: 1, variety: 0, infrastructure: 1 } });
  });

  it('a village next to a top resort borrows from it, one step lower', () => {
    const next = userPlaceAttractiveness({ population: 800, neighbour: { fame: 3, attractions: 3, trails: 3, variety: 3, infrastructure: 3 } });
    expect(next.parts).toEqual({ fame: 2, attractions: 2, trails: 2, variety: 2, infrastructure: 1 });
    expect(next.level).toBe('beliebt');
  });
});

describe('levels and regions', () => {
  it('maps scores to levels', () => {
    const at = (fame: number) => attractivenessOf({ fame, attractions: fame, trails: fame, variety: fame, infrastructure: fame }).level;
    expect([at(3), at(2), at(1), at(0)]).toEqual(['top', 'beliebt', 'wenig', 'wenig']);
  });

  it('a region is as good as its three best places', () => {
    expect(regionAttractiveness([10, 9, 8, 2, 1])).toEqual({ score: 9, level: 'top' });
    expect(regionAttractiveness([])).toBeNull();
  });
});

describe('F14: cities and beach resorts by their main activity', () => {
  it('counts shopping and beaches like trails', () => {
    const frankfurt = catalogAttractiveness({ fame: 3, attractions: 2, themes: { shopping: 3, staedte_kultur: 2, familie: 1 }, population: 650_000 });
    expect(frankfurt.parts.trails).toBe(3);
    expect(frankfurt.level).toBe('top');
    const binz = catalogAttractiveness({ fame: 3, attractions: 1, themes: { strand: 3, wellness: 2 }, population: 5_000 });
    expect(binz.parts.trails).toBe(3);
  });
});

describe('F15: a city of sights is a top place', () => {
  it('counts sightseeing as the main activity', () => {
    const venedig = catalogAttractiveness({ fame: 3, attractions: 3, themes: { staedte_kultur: 3, shopping: 1 }, population: 51_298 });
    expect(venedig.parts.trails).toBe(3);
    expect(venedig.level).toBe('top');
  });
});
