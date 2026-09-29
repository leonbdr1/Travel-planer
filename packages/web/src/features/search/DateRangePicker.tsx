// Date range picker in the style of booking sites: two fields (arrival,
// departure), one calendar popover with two months. The first click sets the
// arrival and hands over to the departure field, the second click sets the
// departure and closes the calendar.
import { useCallback, useRef, useState } from 'react';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { addDays, daysBetween, type IsoDate } from '@reiseplaner/domain';
import { cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { monthGrid, monthStart, nextMonth, pickDate, type RangeField } from './calendar';
import { useDismiss } from './usePopover';

const t = de.wizard.calendar;

function longDate(iso: IsoDate): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${t.weekdaysLong[(d.getUTCDay() + 6) % 7]}, ${Number(iso.slice(8, 10))}. ${t.months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

function shortDate(iso: IsoDate): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${t.weekdaysShort[(d.getUTCDay() + 6) % 7]}, ${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

function Month({
  month,
  start,
  end,
  hover,
  isDisabled,
  onPick,
  onHover,
}: {
  month: IsoDate;
  start: IsoDate | null;
  end: IsoDate | null;
  hover: IsoDate | null;
  isDisabled: (day: IsoDate) => boolean;
  onPick: (day: IsoDate) => void;
  onHover: (day: IsoDate | null) => void;
}) {
  const rangeEnd = end ?? (start && hover && hover > start ? hover : null);
  return (
    <div className="w-full sm:w-72">
      <p className="mb-2 text-center text-sm font-semibold text-zinc-900">
        {t.months[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
      </p>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-zinc-500">
        {t.weekdaysShort.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7" onMouseLeave={() => onHover(null)}>
        {monthGrid(month).map((day, index) => {
          if (day === null) return <span key={`pad-${index}`} />;
          const disabled = isDisabled(day);
          const isStart = day === start;
          const isEnd = day === rangeEnd;
          const inRange = start !== null && rangeEnd !== null && day > start && day < rangeEnd;
          return (
            <button
              key={day}
              type="button"
              data-date={day}
              disabled={disabled}
              aria-label={longDate(day)}
              aria-pressed={isStart || day === end}
              onClick={() => onPick(day)}
              onMouseEnter={() => onHover(day)}
              className={cx(
                'relative my-0.5 h-10 text-sm tabular-nums transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand-600',
                disabled && 'cursor-not-allowed text-zinc-300',
                !disabled && !isStart && !isEnd && !inRange && 'rounded-md text-zinc-900 hover:bg-brand-50',
                inRange && 'bg-brand-50 text-brand-900',
                (isStart || isEnd) && 'bg-brand-600 font-semibold text-brand-contrast',
                isStart && 'rounded-l-md',
                isEnd && 'rounded-r-md',
                isStart && !rangeEnd && 'rounded-md',
              )}
            >
              {Number(day.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  start,
  end,
  today,
  maxWindowDays,
  onChange,
}: {
  start: IsoDate;
  end: IsoDate;
  today: IsoDate;
  maxWindowDays: number;
  onChange: (range: { start: IsoDate; end: IsoDate }) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<RangeField | null>(null);
  const [draftStart, setDraftStart] = useState<IsoDate | null>(null);
  const [draftEnd, setDraftEnd] = useState<IsoDate | null>(null);
  const [hover, setHover] = useState<IsoDate | null>(null);
  const [month, setMonth] = useState<IsoDate>(monthStart(start < today ? today : start));
  const open = active !== null;
  const shownStart = open ? draftStart : start;
  const shownEnd = open ? draftEnd : end;

  const close = useCallback(() => {
    // Closed after only the arrival: keep the previous length of the window.
    if (draftStart !== null && draftEnd === null) {
      onChange({ start: draftStart, end: addDays(draftStart, Math.max(1, daysBetween(start, end))) });
    }
    setActive(null);
    setHover(null);
  }, [draftStart, draftEnd, start, end, onChange]);
  useDismiss(box, open, close);

  function openAt(field: RangeField) {
    setDraftStart(start);
    setDraftEnd(end);
    setMonth(monthStart(field === 'end' ? addDays(end, -28) < start ? start : addDays(end, -28) : start < today ? today : start));
    setActive(field);
  }

  function pick(day: IsoDate) {
    const result = pickDate({ start: draftStart, end: draftEnd, active: active ?? 'start' }, day);
    setDraftStart(result.start);
    setDraftEnd(result.end);
    if (result.done && result.start !== null && result.end !== null) {
      onChange({ start: result.start, end: result.end });
      setActive(null);
      setHover(null);
      return;
    }
    if (result.start !== null && result.end !== null) onChange({ start: result.start, end: result.end });
    setActive(result.active);
  }

  const isDisabled = (day: IsoDate) =>
    day < today || (active === 'end' && draftStart !== null && day > draftStart && daysBetween(draftStart, day) > maxWindowDays);

  const field = (which: RangeField) => {
    const value = which === 'start' ? shownStart : shownEnd;
    const selected = active === which;
    return (
      <button
        type="button"
        id={which === 'start' ? 'window-start' : 'window-end'}
        data-value={value ?? ''}
        aria-haspopup="dialog"
        aria-expanded={selected}
        onClick={() => (selected ? close() : openAt(which))}
        className={cx(
          'flex h-14 min-w-0 flex-1 items-center gap-3 px-3 text-left transition-colors hover:bg-zinc-50',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
          which === 'start' ? 'rounded-l-lg' : 'rounded-r-lg',
          selected && 'bg-brand-50 ring-2 ring-inset ring-brand-600 hover:bg-brand-50',
        )}
      >
        <CalendarDaysIcon aria-hidden="true" className="size-5 shrink-0 text-zinc-500" />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-zinc-500">{which === 'start' ? t.arrival : t.departure}</span>
          <span className={cx('block truncate text-sm font-semibold', value ? 'text-zinc-950' : 'text-zinc-400')}>
            {value ? shortDate(value) : t.choose}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div ref={box} className="relative" data-testid="date-range">
      <div className="flex divide-x divide-zinc-200 rounded-lg bg-white ring-1 ring-inset ring-zinc-300">
        {field('start')}
        {field('end')}
      </div>
      {open ? (
        <div
          role="dialog"
          aria-label={active === 'start' ? t.pickArrival : t.pickDeparture}
          data-testid="calendar"
          className="absolute left-0 z-30 mt-2 w-[min(40rem,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-xl ring-1 ring-zinc-200 sm:w-auto"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={t.prev}
              disabled={nextMonth(month, -1) < monthStart(today)}
              onClick={() => setMonth(nextMonth(month, -1))}
              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:invisible"
            >
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </button>
            <p className="text-sm font-medium text-brand-800" aria-live="polite" data-testid="calendar-hint">
              {active === 'start' ? t.pickArrival : t.pickDeparture}
            </p>
            <button
              type="button"
              aria-label={t.next}
              data-testid="calendar-next"
              onClick={() => setMonth(nextMonth(month, 1))}
              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
            >
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="flex gap-6">
            <Month month={month} start={draftStart} end={draftEnd} hover={hover} isDisabled={isDisabled} onPick={pick} onHover={setHover} />
            <div className="hidden sm:block">
              <Month
                month={nextMonth(month, 1)}
                start={draftStart}
                end={draftEnd}
                hover={hover}
                isDisabled={isDisabled}
                onPick={pick}
                onHover={setHover}
              />
            </div>
          </div>
          {draftStart !== null && (draftEnd !== null || hover !== null) ? (
            <p className="mt-3 text-center text-xs text-zinc-500" data-testid="calendar-span">
              {t.span(daysBetween(draftStart, draftEnd ?? (hover !== null && hover > draftStart ? hover : draftStart)))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
