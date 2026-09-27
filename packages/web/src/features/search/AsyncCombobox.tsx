// Accessible autocomplete (Headless UI Combobox) with debounced async lookup.
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, Spinner } from '@reiseplaner/ui';

const DEBOUNCE_MS = 250;

export interface AsyncComboboxProps<T> {
  id: string;
  value: T | null;
  onChange: (value: T | null) => void;
  load: (query: string, signal: AbortSignal) => Promise<T[]>;
  itemKey: (item: T) => string;
  itemLabel: (item: T) => string;
  renderItem?: (item: T) => ReactNode;
  placeholder: string;
  emptyText: string;
  invalid?: boolean;
  describedBy?: string;
  clearOnSelect?: boolean;
  testId?: string;
}

export function AsyncCombobox<T>(props: AsyncComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const { load } = props;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const timer = setTimeout(() => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setLoading(true);
      load(q, c.signal)
        .then((result) => {
          if (!c.signal.aborted) setItems(result);
        })
        .catch(() => {
          if (!c.signal.aborted) setItems([]);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, load]);

  return (
    <Combobox
      value={props.value}
      onChange={(v: T | null) => {
        props.onChange(v);
        if (props.clearOnSelect) setQuery('');
      }}
      onClose={() => setQuery('')}
      by={(a: T | null, b: T | null) => (a && b ? props.itemKey(a) === props.itemKey(b) : a === b)}
    >
      <div className="relative">
        <ComboboxInput
          id={props.id}
          data-testid={props.testId}
          aria-invalid={props.invalid ? 'true' : undefined}
          aria-describedby={props.describedBy}
          autoComplete="off"
          placeholder={props.placeholder}
          displayValue={(item: T | null) => (item && !props.clearOnSelect ? props.itemLabel(item) : '')}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm/6 aria-[invalid=true]:ring-red-400"
        />
        {loading ? <Spinner className="absolute right-3 top-2.5 size-4" /> : null}
      </div>
      <ComboboxOptions
        anchor="bottom start"
        className="z-20 mt-1 w-(--input-width) rounded-lg bg-white p-1 shadow-lg ring-1 ring-zinc-200 empty:invisible"
      >
        {items.length === 0 && query.trim().length >= 2 && !loading ? (
          <div className="px-3 py-2 text-sm text-zinc-500">{props.emptyText}</div>
        ) : null}
        {items.map((item) => (
          <ComboboxOption
            key={props.itemKey(item)}
            value={item}
            className={cx('cursor-pointer rounded-md px-3 py-2 text-sm text-zinc-900 data-focus:bg-brand-50 data-focus:text-brand-900')}
          >
            {props.renderItem ? props.renderItem(item) : props.itemLabel(item)}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
