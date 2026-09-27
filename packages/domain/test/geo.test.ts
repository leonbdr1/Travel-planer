import { describe, expect, it } from 'vitest';
import { estimateDrive, haversineKm, originCell, withinPrefilter } from '../src/geo';

const stuttgart = { lat: 48.7823, lng: 9.177 };
const oberstdorf = { lat: 47.4099, lng: 10.2797 };

describe('geo', () => {
  it('computes great-circle distances', () => {
    expect(haversineKm(stuttgart, oberstdorf)).toBeCloseTo(173.2, 1);
    expect(haversineKm(stuttgart, stuttgart)).toBe(0);
  });

  it('snaps origins to a 0.02° grid', () => {
    expect(originCell(stuttgart)).toEqual({ key: '48.78:9.18', lat: 48.78, lng: 9.18 });
    expect(originCell({ lat: 47.41, lng: 10.29 }).key).toBe('47.42:10.30');
  });

  it('prefilters by straight line at 1.2 km per minute', () => {
    expect(withinPrefilter(stuttgart, oberstdorf, 180)).toBe(true);
    expect(withinPrefilter(stuttgart, oberstdorf, 120)).toBe(false);
  });

  it('estimates drive time from distance, road factor and speed', () => {
    const est = estimateDrive(stuttgart, oberstdorf);
    expect(est.distanceKm).toBe(225.1);
    expect(est.durationMin).toBe(193);
  });
});
