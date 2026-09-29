// Flexible nights (Aufgabe 4, docs/logik/flexible-naechte.md): the extra
// night of the same kind of stay compared with the nights before.
import { describe, expect, it } from 'vitest';
import { extraNights, type NightOffer } from '../src/nights';

const offer = (id: string, checkin: string, nights: number, totalCents: number, patch: Partial<NightOffer> = {}): NightOffer => ({
  id,
  hotelId: 'H',
  roomName: 'Doppelzimmer',
  boardType: 'BB',
  refundable: true,
  checkin,
  nights,
  totalCents,
  ...patch,
});

describe('extraNights', () => {
  it('prices the extra night against the nightly price of the shorter stay', () => {
    const result = extraNights([
      offer('a2', '2026-10-02', 2, 20_000),
      offer('a3', '2026-10-02', 3, 25_000), // +50 € against 100 €/night → cheap
      offer('b2', '2026-10-09', 2, 20_000),
      offer('b3', '2026-10-09', 3, 30_000), // +100 € → normal
      offer('c2', '2026-10-16', 2, 20_000),
      offer('c3', '2026-10-16', 3, 34_000), // +140 € → expensive
    ]);
    expect(result.get('a2')).toEqual({ fromNights: 2, toNights: 3, longerOfferId: 'a3', extraCents: 5_000, nightlyCents: 10_000, verdict: 'cheap' });
    expect(result.get('b2')?.verdict).toBe('normal');
    expect(result.get('c2')).toMatchObject({ extraCents: 14_000, verdict: 'expensive' });
    // The longer stay knows the comparison as well.
    expect(result.get('a3')).toEqual(result.get('a2'));
  });

  it('compares only the same room, board, cancellation terms and arrival', () => {
    const result = extraNights([
      offer('d2', '2026-10-02', 2, 20_000),
      offer('suite3', '2026-10-02', 3, 45_000, { roomName: 'Suite' }),
      offer('ro3', '2026-10-02', 3, 21_000, { boardType: 'RO' }),
      offer('nr3', '2026-10-02', 3, 21_000, { refundable: false }),
      offer('later3', '2026-10-03', 3, 21_000),
      offer('other3', '2026-10-02', 3, 21_000, { hotelId: 'X' }),
    ]);
    expect(result.size).toBe(0);
  });

  it('chains 2 → 3 → 4 nights and uses the cheapest offer of a kind', () => {
    const result = extraNights([
      offer('n2', '2026-10-02', 2, 20_000),
      offer('n2b', '2026-10-02', 2, 22_000),
      offer('n3', '2026-10-02', 3, 26_000),
      offer('n4', '2026-10-02', 4, 40_000),
    ]);
    expect(result.get('n2')).toMatchObject({ fromNights: 2, toNights: 3, extraCents: 6_000, verdict: 'cheap' });
    // n3 is the shorter stay of 3 → 4: +140 € against 86.67 €/night → expensive.
    expect(result.get('n3')).toMatchObject({ fromNights: 3, toNights: 4, extraCents: 14_000, verdict: 'expensive' });
    expect(result.get('n4')).toMatchObject({ fromNights: 3, toNights: 4 });
    expect(result.has('n2b')).toBe(false);
  });
});
