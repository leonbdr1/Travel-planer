// Small "i" with an explanation panel, as travel portals use it: opens when
// the pointer rests on it, on focus and on tap; stays open while the pointer
// is on the panel (so a link inside can be clicked); Escape or a click outside
// closes it.
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import { cx } from './cx';

const CLOSE_DELAY_MS = 180;
const EDGE_PX = 8;

export function InfoPopover({
  label,
  children,
  align = 'left',
  testId,
  className,
}: {
  /** Accessible name of the trigger, e.g. "Was bedeutet unser Wert?". */
  label: string;
  children: ReactNode;
  /** Which edge of the trigger the panel aligns to (right near the right page edge). */
  align?: 'left' | 'right';
  testId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();
  const panel = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  // Keep the panel inside the viewport (narrow screens, triggers near an edge).
  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const rect = panel.current?.getBoundingClientRect();
    if (!rect) return;
    const width = document.documentElement.clientWidth;
    if (rect.right > width - EDGE_PX) setShift(width - EDGE_PX - rect.right);
    else if (rect.left < EDGE_PX) setShift(EDGE_PX - rect.left);
  }, [open]);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => cancelClose, []);

  return (
    <span ref={box} className={cx('relative inline-flex', className)} onMouseEnter={() => (cancelClose(), setOpen(true))} onMouseLeave={closeSoon}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={testId}
        // A tap opens (a toggle would close what focus or hover just opened); outside, Escape or leaving closes.
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className="inline-flex rounded-full text-zinc-400 hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600"
      >
        <InformationCircleIcon aria-hidden="true" className="size-4" />
      </button>
      {open ? (
        <span
          ref={panel}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          id={panelId}
          role="dialog"
          aria-label={label}
          data-testid={testId ? `${testId}-panel` : undefined}
          className={cx(
            'absolute top-full z-40 mt-2 block w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-3 text-left text-sm font-normal leading-snug whitespace-normal text-zinc-700 shadow-xl ring-1 ring-zinc-200',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
