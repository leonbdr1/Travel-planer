// Hover and focus hint: a small dark panel above the trigger (below when
// there is no room), kept inside the viewport. Fixed positioning lets it
// escape scroll containers such as the price matrix. It is visual only: the
// trigger carries the same text for screen readers (e.g. in aria-label).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

const GAP_PX = 8;
const EDGE_PX = 8;

interface Placement {
  top: number;
  left: number;
  below: boolean;
}

export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const a = anchor.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!a || !p) return;
    const below = a.top - p.height - GAP_PX < EDGE_PX;
    const centre = a.left + a.width / 2 - p.width / 2;
    const left = Math.min(Math.max(EDGE_PX, centre), Math.max(EDGE_PX, window.innerWidth - p.width - EDGE_PX));
    setPlacement({ top: below ? a.bottom + GAP_PX : a.top - p.height - GAP_PX, left, below });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={anchor}
      className={cx('block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          ref={panel}
          aria-hidden="true"
          data-testid="tooltip"
          className={cx(
            'pointer-events-none fixed z-50 block w-max max-w-xs rounded-lg bg-zinc-900 px-3 py-2 text-left text-xs leading-snug font-normal whitespace-normal text-white shadow-lg',
            placement ? 'visible' : 'invisible',
          )}
          style={placement ? { top: placement.top, left: placement.left } : { top: 0, left: 0 }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
