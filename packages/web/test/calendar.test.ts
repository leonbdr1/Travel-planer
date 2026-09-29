// Date range picker (Aufgabe 1): month grid and the two-click flow known
// from booking sites — first click arrival, second click departure.
import { describe, expect, it } from 'vitest';
import { monthGrid, monthStart, pickDate, type RangePick } from '../src/features/search/calendar';

describe('monthGrid', () => {
  it('starts on Monday and pads with nulls', () => {
    // 1 October 2026 is a Thursday.
    const grid = monthGrid('2026-10-01');
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(grid.filter((d) => d !== null)).toHaveLength(31);
    expect(grid.length % 7).toBe(0);
    expect(grid.at(-1)).toBe(null);
  });

  it('handles a month starting on Monday', () => {
    // 1 February 2027 is a Monday.
    expect(monthGrid('2027-02-01')[0]).toBe('2027-02-01');
    expect(monthGrid('2027-02-01').filter((d) => d !== null)).toHaveLength(28);
  });

  it('monthStart normalises any day', () => {
    expect(monthStart('2026-10-17')).toBe('2026-10-01');
  });
});

describe('pickDate', () => {
  const empty: RangePick = { start: '2026-10-01', end: '2026-10-12', active: 'start' };

  it('first click sets arrival, clears the old departure and moves on to departure', () => {
    expect(pickDate(empty, '2026-10-05')).toEqual({ start: '2026-10-05', end: null, active: 'end', done: false });
    expect(pickDate(empty, '2026-10-20')).toEqual({ start: '2026-10-20', end: null, active: 'end', done: false });
  });

  it('second click sets departure and closes', () => {
    const r = pickDate({ start: '2026-10-05', end: null, active: 'end' }, '2026-10-19');
    expect(r).toEqual({ start: '2026-10-05', end: '2026-10-19', active: 'start', done: true });
  });

  it('a departure on or before the arrival starts over', () => {
    const r = pickDate({ start: '2026-10-05', end: null, active: 'end' }, '2026-10-03');
    expect(r).toEqual({ start: '2026-10-03', end: null, active: 'end', done: false });
    const same = pickDate({ start: '2026-10-05', end: null, active: 'end' }, '2026-10-05');
    expect(same).toEqual({ start: '2026-10-05', end: null, active: 'end', done: false });
  });

  it('opening on the departure field keeps the arrival', () => {
    const r = pickDate({ start: '2026-10-01', end: '2026-10-12', active: 'end' }, '2026-10-30');
    expect(r).toEqual({ start: '2026-10-01', end: '2026-10-30', active: 'start', done: true });
  });
});
