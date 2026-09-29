// Pure helpers of the date range picker: the month grid (weeks start on
// Monday) and the two-click flow known from booking sites.
import { addDays, addMonths, isoWeekday, type IsoDate } from '@reiseplaner/domain';

export type RangeField = 'start' | 'end';

export interface RangePick {
  start: IsoDate | null;
  end: IsoDate | null;
  active: RangeField;
}

export interface RangePickResult extends RangePick {
  /** true once arrival and departure are set: the picker closes. */
  done: boolean;
}

export function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function nextMonth(month: IsoDate, delta = 1): IsoDate {
  return addMonths(monthStart(month), delta);
}

/** Days of the month as ISO dates, padded with null to whole weeks (Mon–Sun). */
export function monthGrid(month: IsoDate): (IsoDate | null)[] {
  const first = monthStart(month);
  const cells: (IsoDate | null)[] = Array.from({ length: isoWeekday(first) - 1 }, () => null);
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * One click in the calendar. On the arrival field the click sets the arrival,
 * clears the old departure and hands over to the departure field; on the
 * departure field a later day sets the departure and closes, an earlier (or
 * the same) day starts over as the new arrival.
 */
export function pickDate(pick: RangePick, day: IsoDate): RangePickResult {
  if (pick.active === 'end' && pick.start !== null && day > pick.start) {
    return { start: pick.start, end: day, active: 'start', done: true };
  }
  return { start: day, end: null, active: 'end', done: false };
}
