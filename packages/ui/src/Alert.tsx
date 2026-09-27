import type { ReactNode } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';
import { cx } from './cx';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<AlertTone, { box: string; icon: typeof InformationCircleIcon; iconClass: string }> = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', icon: InformationCircleIcon, iconClass: 'text-sky-500' },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: CheckCircleIcon, iconClass: 'text-emerald-500' },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', icon: ExclamationTriangleIcon, iconClass: 'text-amber-500' },
  error: { box: 'bg-red-50 text-red-900 ring-red-200', icon: XCircleIcon, iconClass: 'text-red-500' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={cx('flex gap-3 rounded-xl p-4 text-sm ring-1 ring-inset', t.box, className)}
    >
      <Icon aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', t.iconClass)} />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
