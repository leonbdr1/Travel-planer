// Stay dates from the travel pattern (architektur.md 6.1, konzept.md 9.1):
// every arrival day d from max(window.start, today + 1) to window.end − nights
// that falls on an allowed ISO weekday yields (d, d + nights). With a night
// range (Aufgabe 4, docs/logik/flexible-naechte.md) every n from nights to
// nightsMax yields (d, d + n) while it fits into the window.
import type { IsoDate } from './types';

export interface StayDate {
  checkin: IsoDate;
  checkout: IsoDate;
}

export interface DatesInput {
  window: { start: IsoDate; end: IsoDate };
  nights: number;
  /** Longest stay of a night range ("2 bis 3 Nächte"); null or missing: exactly `nights`. */
  nightsMax?: number | null;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  arrivalWeekdays: number[];
  today: IsoDate;
}

export interface DatesLimits {
  maxDates: number;
  maxNights: number;
  maxWindowDays: number;
}

export type DatesError =
  | 'invalid_date'
  | 'invalid_nights'
  | 'no_weekdays'
  | 'invalid_window'
  | 'window_in_past'
  | 'window_too_long'
  | 'window_too_short'
  | 'no_dates'
  | 'too_many_dates';

export type DatesResult = { ok: true; dates: StayDate[] } | { ok: false; error: DatesError; count?: number };

const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: IsoDate): number | null {
  if (!ISO.test(value)) return null;
  const ms = Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
  return new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}

export function formatIsoDate(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const ms = parseIsoDate(date);
  if (ms === null) throw new Error(`invalid ISO date ${date}`);
  return formatIsoDate(ms + days * DAY_MS);
}

/** Calendar months later (negative: earlier); the day is clamped to the month's end. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const ms = parseIsoDate(date);
  if (ms === null) throw new Error(`invalid ISO date ${date}`);
  const d = new Date(ms);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return formatIsoDate(Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay)));
}

/** ISO weekday of a date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: IsoDate): number {
  const ms = parseIsoDate(date);
  if (ms === null) throw new Error(`invalid ISO date ${date}`);
  return ((new Date(ms).getUTCDay() + 6) % 7) + 1;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (a === null || b === null) throw new Error('invalid ISO date');
  return Math.round((b - a) / DAY_MS);
}

export function generateStayDates(input: DatesInput, limits: DatesLimits): DatesResult {
  const start = parseIsoDate(input.window.start);
  const end = parseIsoDate(input.window.end);
  const today = parseIsoDate(input.today);
  if (start === null || end === null || today === null) return { ok: false, error: 'invalid_date' };
  if (!Number.isInteger(input.nights) || input.nights < 1 || input.nights > limits.maxNights) {
    return { ok: false, error: 'invalid_nights' };
  }
  const nightsMax = input.nightsMax ?? input.nights;
  if (!Number.isInteger(nightsMax) || nightsMax < input.nights || nightsMax > limits.maxNights) {
    return { ok: false, error: 'invalid_nights' };
  }
  const weekdays = new Set(input.arrivalWeekdays.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7));
  if (weekdays.size === 0) return { ok: false, error: 'no_weekdays' };
  if (end <= start) return { ok: false, error: 'invalid_window' };
  if (end <= today) return { ok: false, error: 'window_in_past' };
  if ((end - start) / DAY_MS > limits.maxWindowDays) return { ok: false, error: 'window_too_long' };
  if ((end - start) / DAY_MS < input.nights) return { ok: false, error: 'window_too_short' };

  const first = Math.max(start, today + DAY_MS);
  const lastArrival = end - input.nights * DAY_MS;
  const dates: StayDate[] = [];
  for (let d = first; d <= lastArrival; d += DAY_MS) {
    const weekday = ((new Date(d).getUTCDay() + 6) % 7) + 1;
    if (!weekdays.has(weekday)) continue;
    for (let n = input.nights; n <= nightsMax && d + n * DAY_MS <= end; n += 1) {
      dates.push({ checkin: formatIsoDate(d), checkout: formatIsoDate(d + n * DAY_MS) });
    }
  }
  if (dates.length === 0) return { ok: false, error: 'no_dates' };
  if (dates.length > limits.maxDates) return { ok: false, error: 'too_many_dates', count: dates.length };
  return { ok: true, dates };
}

export type CombinationsResult = { ok: true; count: number } | { ok: false; error: 'too_many_combinations'; count: number };

export function checkCombinations(places: number, dates: number, maxCombinations: number): CombinationsResult {
  const count = places * dates;
  return count > maxCombinations ? { ok: false, error: 'too_many_combinations', count } : { ok: true, count };
}
