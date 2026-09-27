import type { ReactNode } from 'react';
import { CheckIcon } from '@heroicons/react/16/solid';
import { cx } from './cx';

/** Toggle chip for themes and wishes. */
export function Chip({
  selected,
  onToggle,
  children,
  disabled,
  title,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      onClick={onToggle}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        selected
          ? 'bg-brand-600 text-brand-contrast ring-brand-600 hover:bg-brand-700'
          : 'bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {selected ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
      {children}
    </button>
  );
}
