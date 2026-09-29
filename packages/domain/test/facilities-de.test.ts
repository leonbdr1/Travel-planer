// Facility labels in German (Aufgabe 12).
import { describe, expect, it } from 'vitest';
import { facilitiesDe, facilityDe } from '../src/facilities-de';

describe('facilityDe', () => {
  it("translates Ben's list", () => {
    const ben = ['WiFi available', 'Free WiFi', 'Parking', 'Free Parking', 'Non-smoking rooms', 'Heating', 'Terrace', 'Garden', 'Pets allowed', 'Hiking', 'Fishing', 'Cycling', 'Tour desk'];
    expect(ben.map((n) => facilityDe(n)?.label)).toEqual([
      'WLAN verfügbar',
      'Kostenloses WLAN',
      'Parkplatz',
      'Kostenloser Parkplatz',
      'Nichtraucherzimmer',
      'Heizung',
      'Terrasse',
      'Garten',
      'Haustiere erlaubt',
      'Wandern',
      'Angeln',
      'Radfahren',
      'Tourenberatung',
    ]);
  });

  it('ignores case, spacing and "&"', () => {
    expect(facilityDe('  free   wifi ')?.label).toBe('Kostenloses WLAN');
    expect(facilityDe('Spa & wellness centre')?.label).toBe('Spa- und Wellnessbereich');
  });

  it('keeps German names and does not know unknown English ones', () => {
    expect(facilityDe('Kostenloses WLAN')).toEqual({ label: 'Kostenloses WLAN', group: 'internet' });
    expect(facilityDe('Karaoke')).toBeNull();
  });
});

describe('facilitiesDe', () => {
  it('groups, removes duplicates and never returns English labels', () => {
    const { groups, unknown } = facilitiesDe(['Free WiFi', 'Parking', 'Sauna', 'Hiking', 'Free WiFi', 'Karaoke', 'Garden', 'WiFi']);
    expect(groups).toEqual([
      { group: 'internet', labels: ['Kostenloses WLAN', 'WLAN'] },
      { group: 'parken', labels: ['Parkplatz'] },
      { group: 'wellness', labels: ['Sauna'] },
      { group: 'draussen', labels: ['Garten'] },
      { group: 'aktivitaeten', labels: ['Wandern'] },
    ]);
    expect(unknown).toEqual(['Karaoke']);
  });
});
