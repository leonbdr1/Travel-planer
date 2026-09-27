import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-950/5 sm:p-6', className)} {...props} />;
}
