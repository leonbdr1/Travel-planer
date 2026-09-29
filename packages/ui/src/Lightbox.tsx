// Photo lightbox (Aufgabe 11): one photo large on a dark backdrop, previous
// and next by buttons, arrow keys or swiping, a counter, thumbnails below,
// Escape or the close button to leave.
import { useEffect, useRef } from 'react';
import { Dialog as HDialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cx } from './cx';

const SWIPE_PX = 40;

export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  title,
  labels,
}: {
  photos: readonly string[];
  /** Shown photo; null: closed. */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  title: string;
  labels: { close: string; prev: string; next: string; counter: (n: number, total: number) => string; photo: (n: number) => string };
}) {
  const touchX = useRef<number | null>(null);
  const open = index !== null;
  const count = photos.length;
  const go = (delta: number) => {
    if (index === null || count === 0) return;
    onIndex((index + delta + count) % count);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <HDialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/95" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-2 sm:p-6">
        <DialogPanel className="flex h-full w-full max-w-6xl flex-col" data-testid="lightbox">
          <div className="flex items-center justify-between gap-3 text-white">
            <DialogTitle className="truncate text-sm font-medium">{title}</DialogTitle>
            <span className="text-sm tabular-nums text-zinc-300" data-testid="lightbox-counter">
              {index !== null ? labels.counter(index + 1, count) : ''}
            </span>
            <button type="button" onClick={onClose} aria-label={labels.close} className="rounded-full p-2 hover:bg-white/10" data-testid="lightbox-close">
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center py-3"
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              touchX.current = null;
              if (start === null || end === undefined || Math.abs(end - start) < SWIPE_PX) return;
              go(end < start ? 1 : -1);
            }}
          >
            {index !== null ? (
              <img src={photos[index]} alt={labels.photo(index + 1)} className="max-h-full max-w-full rounded-lg object-contain" data-testid="lightbox-image" />
            ) : null}
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={labels.prev}
                  data-testid="lightbox-prev"
                  className="absolute left-1 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:left-3 sm:p-3"
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={labels.next}
                  data-testid="lightbox-next"
                  className="absolute right-1 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:right-3 sm:p-3"
                >
                  <ChevronRightIcon aria-hidden="true" className="size-6" />
                </button>
              </>
            ) : null}
          </div>
          {count > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => onIndex(i)}
                  aria-label={labels.photo(i + 1)}
                  aria-current={i === index}
                  className={cx('shrink-0 overflow-hidden rounded-md ring-2', i === index ? 'ring-white' : 'opacity-60 ring-transparent hover:opacity-100')}
                >
                  <img src={src} alt="" className="h-12 w-16 object-cover sm:h-14 sm:w-20" />
                </button>
              ))}
            </div>
          ) : null}
        </DialogPanel>
      </div>
    </HDialog>
  );
}
