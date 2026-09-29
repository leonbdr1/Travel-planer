// Aufgabe F15: the mini map switches to the Europe frame when a region lies
// outside Germany, Austria, Switzerland and South Tyrol.
import { describe, expect, it } from 'vitest';
import { mapFrame } from '../src/features/search/map-frame';
import { EUROPE_OUTLINES } from '../src/features/search/europe-outlines';

describe('overview map frame', () => {
  it('keeps the DACH frame for the Allgäu and South Tyrol', () => {
    expect(mapFrame([{ lat: 47.4, lng: 10.28 }, { lat: 46.67, lng: 11.16 }])).toBe('dach');
  });

  it('uses the Europe frame for Venice, Lisbon or Crete', () => {
    expect(mapFrame([{ lat: 45.44, lng: 12.33 }])).toBe('europe');
    expect(mapFrame([{ lat: 48.14, lng: 11.58 }, { lat: 38.72, lng: -9.13 }])).toBe('europe');
    expect(mapFrame([{ lat: 35.51, lng: 24.02 }])).toBe('europe');
  });

  it('has outlines for Germany, Italy and Spain', () => {
    const codes = new Set(EUROPE_OUTLINES.map((c) => c.code));
    for (const code of ['276', '380', '724']) expect(codes).toContain(code);
  });
});

describe('drive time options (Aufgabe F16)', () => {
  it('offers up to 30 hours, and the API accepts exactly that (drift check)', async () => {
    const { MAX_DRIVE_MINUTES: api } = await import('@reiseplaner/contracts');
    const { constants } = await import('@reiseplaner/domain');
    const domain = constants.MAX_DRIVE_MINUTES;
    expect(api).toBe(domain);
    expect(api).toBe(1800);
  });
});
