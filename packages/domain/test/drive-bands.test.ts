// Aufgabe F16: drive times in bands, the nearer the more exact.
import { describe, expect, it } from 'vitest';
import { driveBand, estimateLongDrive, formatDrive, formatDriveRange, isFlightDistance } from '../src/drive-bands';

const MUENCHEN = { lat: 48.14, lng: 11.58 };

describe('drive bands', () => {
  it('is exact under 7 hours (Venedig 6–7 h)', () => {
    expect(formatDrive(275)).toBe('4 h 35 min');
    expect(formatDrive(419)).toBe('6 h 59 min');
    expect(driveBand(419)).toBe('exact');
  });

  it('rounds to full hours from 7 to 10 hours', () => {
    expect(formatDrive(420)).toBe('ca. 7 h');
    expect(formatDrive(485)).toBe('ca. 8 h');
    expect(formatDrive(599)).toBe('ca. 10 h');
  });

  it('uses blocks from 10 to 30 hours and a plane from 30 hours', () => {
    expect(formatDrive(600)).toBe('über 10 h');
    expect(formatDrive(1199)).toBe('über 10 h');
    expect(formatDrive(1200)).toBe('über 20 h');
    expect(formatDrive(1799)).toBe('über 20 h');
    expect(formatDrive(1800)).toBe('über 30 h');
    expect(isFlightDistance(1799)).toBe(false);
    expect(isFlightDistance(1800)).toBe(true);
  });

  it('formats spans', () => {
    expect(formatDriveRange(246, 288)).toBe('4 h 6 min–4 h 48 min');
    expect(formatDriveRange(457, 737)).toBe('ca. 8 h bis über 10 h');
    expect(formatDriveRange(1300, 1500)).toBe('über 20 h');
  });

  it('puts Spain over 10 h, Portugal over 20 h and the Canaries over 30 h from Munich', () => {
    const barcelona = estimateLongDrive(MUENCHEN, { lat: 41.39, lng: 2.16 }).durationMin;
    const lissabon = estimateLongDrive(MUENCHEN, { lat: 38.72, lng: -9.13 }).durationMin;
    const teneriffa = estimateLongDrive(MUENCHEN, { lat: 28.1, lng: -16.72 }).durationMin;
    expect(driveBand(barcelona)).toBe('over10');
    expect(driveBand(lissabon)).toBe('over20');
    expect(driveBand(teneriffa)).toBe('over30');
  });
});
