import type { ReactNode } from 'react';
import { Dialog as HDialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { cx } from './cx';

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;
  return (
    <HDialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/40" />
      <div className="fixed inset-0 flex w-screen items-end justify-center overflow-y-auto p-2 sm:items-center sm:p-6">
        <DialogPanel className={cx('w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-950/10', widths[size])}>
          <DialogTitle className="text-lg font-semibold text-zinc-950">{title}</DialogTitle>
          <div className="mt-3 text-sm text-zinc-700">{children}</div>
          {actions ? <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div> : null}
        </DialogPanel>
      </div>
    </HDialog>
  );
}
