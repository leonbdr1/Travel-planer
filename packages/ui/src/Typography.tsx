import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export function Heading({
  level = 1,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const Tag = `h${level}` as const;
  const styles = {
    1: 'text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl',
    2: 'text-2xl font-semibold tracking-tight text-zinc-950',
    3: 'text-lg font-semibold text-zinc-950',
    4: 'text-base font-semibold text-zinc-950',
  } as const;
  return (
    <Tag className={cx(styles[level], className)} {...props}>
      {children}
    </Tag>
  );
}

export function Text({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('text-base/7 text-zinc-600', className)} {...props} />;
}

export function Small({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('text-sm text-zinc-500', className)} {...props} />;
}
