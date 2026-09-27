import { cx } from './cx';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
      />
      {label ? <span className="text-sm text-zinc-600">{label}</span> : <span className="sr-only">…</span>}
    </span>
  );
}
