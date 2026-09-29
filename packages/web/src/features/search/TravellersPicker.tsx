// Travellers field in the style of booking sites: one line ("2 Erwachsene ·
// 1 Zimmer"), a popover with plus/minus counters and the children's ages.
import { useCallback, useRef, useState } from 'react';
import { MinusIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/20/solid';
import { Button, Select, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { useDismiss } from './usePopover';

const t = de.wizard.frame;
const MAX_CHILD_AGE = 17;
const DEFAULT_CHILD_AGE = 8;

function Counter({
  label,
  value,
  min,
  max,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2" data-testid={testId}>
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t.less(label)}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="rounded-md p-1.5 text-brand-700 ring-1 ring-inset ring-brand-600 hover:bg-brand-50 disabled:text-zinc-300 disabled:ring-zinc-200 disabled:hover:bg-transparent"
        >
          <MinusIcon aria-hidden="true" className="size-4" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={t.more(label)}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="rounded-md p-1.5 text-brand-700 ring-1 ring-inset ring-brand-600 hover:bg-brand-50 disabled:text-zinc-300 disabled:ring-zinc-200 disabled:hover:bg-transparent"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function TravellersPicker({
  adults,
  childrenAges,
  rooms,
  limits,
  onChange,
}: {
  adults: number;
  childrenAges: number[];
  rooms: number;
  limits: { maxAdultsPerRoom: number; maxChildrenPerRoom: number; maxRooms: number };
  onChange: (patch: { adults?: number; childrenAges?: number[]; rooms?: number }) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(box, open, close);

  return (
    <div ref={box} className="relative" data-testid="travellers">
      <button
        type="button"
        id="travellers"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex h-14 w-full items-center gap-3 rounded-lg bg-white px-3 text-left ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
          open && 'bg-brand-50 ring-2 ring-brand-600',
        )}
      >
        <UserGroupIcon aria-hidden="true" className="size-5 shrink-0 text-zinc-500" />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-zinc-500">{t.travellers}</span>
          <span className="block truncate text-sm font-semibold text-zinc-950" data-testid="travellers-summary">
            {t.travellersSummary(adults, childrenAges.length, rooms)}
          </span>
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t.travellers}
          className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-xl ring-1 ring-zinc-200"
        >
          <Counter
            label={t.adults}
            testId="count-adults"
            value={adults}
            min={1}
            max={limits.maxAdultsPerRoom * rooms}
            onChange={(v) => onChange({ adults: v })}
          />
          <Counter
            label={t.children}
            testId="count-children"
            value={childrenAges.length}
            min={0}
            max={limits.maxChildrenPerRoom * rooms}
            onChange={(v) =>
              onChange({
                childrenAges: v > childrenAges.length ? [...childrenAges, DEFAULT_CHILD_AGE] : childrenAges.slice(0, v),
              })
            }
          />
          {childrenAges.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 pb-2">
              {childrenAges.map((age, index) => (
                <label key={index} className="text-xs text-zinc-600">
                  {t.childAge(index + 1)}
                  <Select
                    className="mt-1"
                    value={age}
                    onChange={(e) => onChange({ childrenAges: childrenAges.map((a, i) => (i === index ? Number(e.target.value) : a)) })}
                  >
                    {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {t.years(n)}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          ) : null}
          <Counter
            label={t.rooms}
            testId="count-rooms"
            value={rooms}
            min={1}
            max={limits.maxRooms}
            onChange={(v) =>
              onChange({
                rooms: v,
                adults: Math.min(Math.max(adults, v), limits.maxAdultsPerRoom * v),
                childrenAges: childrenAges.slice(0, limits.maxChildrenPerRoom * v),
              })
            }
          />
          <Button className="mt-3 w-full" variant="secondary" onClick={close}>
            {t.done}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
