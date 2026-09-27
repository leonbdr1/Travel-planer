import { describe, expect, it } from 'vitest';
import { addDays, checkCombinations, generateStayDates, isoWeekday } from '../src/dates';

const limits = { maxDates: 12, maxNights: 14, maxWindowDays: 400 };
const base = { window: { start: '2026-10-01', end: '2026-11-30' }, nights: 2, arrivalWeekdays: [5], today: '2026-09-27' };

describe('generateStayDates (architektur.md 6.1)', () => {
  it('01.10.–30.11.2026, 2 nights, Friday arrival → exactly 9 weekends', () => {
    const result = generateStayDates(base, limits);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dates).toHaveLength(9);
    expect(result.dates[0]).toEqual({ checkin: '2026-10-02', checkout: '2026-10-04' });
    expect(result.dates.at(-1)).toEqual({ checkin: '2026-11-27', checkout: '2026-11-29' });
    expect(result.dates.every((d) => isoWeekday(d.checkin) === 5)).toBe(true);
  });

  it('13 dates → too_many_dates with the count', () => {
    const result = generateStayDates({ ...base, arrivalWeekdays: [5, 6], window: { start: '2026-10-01', end: '2026-11-15' } }, limits);
    expect(result).toEqual({ ok: false, error: 'too_many_dates', count: 13 });
  });

  it('the whole stay lies inside the window', () => {
    const result = generateStayDates({ ...base, window: { start: '2026-10-01', end: '2026-10-11' }, nights: 3 }, limits);
    expect(result.ok && result.dates).toEqual([{ checkin: '2026-10-02', checkout: '2026-10-05' }]);
  });

  it('starts tomorrow at the earliest', () => {
    const result = generateStayDates({ ...base, window: { start: '2026-09-20', end: '2026-10-06' }, arrivalWeekdays: [7] }, limits);
    // Sunday 27.09. is today → first arrival Sunday 04.10.
    expect(result.ok && result.dates.map((d) => d.checkin)).toEqual(['2026-10-04']);
  });

  it('rejects invalid input with a precise error', () => {
    expect(generateStayDates({ ...base, nights: 0 }, limits)).toMatchObject({ error: 'invalid_nights' });
    expect(generateStayDates({ ...base, nights: 15 }, limits)).toMatchObject({ error: 'invalid_nights' });
    expect(generateStayDates({ ...base, arrivalWeekdays: [] }, limits)).toMatchObject({ error: 'no_weekdays' });
    expect(generateStayDates({ ...base, window: { start: '2026-11-30', end: '2026-10-01' } }, limits)).toMatchObject({ error: 'invalid_window' });
    expect(generateStayDates({ ...base, window: { start: '2026-10-01', end: '2026-10-02' } }, limits)).toMatchObject({ error: 'window_too_short' });
    expect(generateStayDates({ ...base, window: { start: '2026-08-01', end: '2026-09-01' } }, limits)).toMatchObject({ error: 'window_in_past' });
    expect(generateStayDates({ ...base, window: { start: '2026-10-01', end: '2027-12-01' } }, limits)).toMatchObject({ error: 'window_too_long' });
    expect(generateStayDates({ ...base, window: { start: '2026-10-05', end: '2026-10-08' } }, limits)).toMatchObject({ error: 'no_dates' });
    expect(generateStayDates({ ...base, window: { start: '2026-02-30', end: '2026-10-08' } }, limits)).toMatchObject({ error: 'invalid_date' });
  });

  it('date helpers work in UTC', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(isoWeekday('2026-10-02')).toBe(5);
    expect(isoWeekday('2026-10-04')).toBe(7);
  });
});

describe('checkCombinations', () => {
  it('limits places × dates', () => {
    expect(checkCombinations(10, 12, 120)).toEqual({ ok: true, count: 120 });
    expect(checkCombinations(11, 12, 120)).toEqual({ ok: false, error: 'too_many_combinations', count: 132 });
  });
});
