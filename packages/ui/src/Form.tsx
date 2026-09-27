import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';

const control =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-zinc-50 disabled:text-zinc-500 sm:text-sm/6 aria-[invalid=true]:ring-red-400';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx('block text-sm/6 font-medium text-zinc-900', className)} {...props} />;
}

export function Description({ className, ...props }: { className?: string; children: ReactNode; id?: string }) {
  return <p className={cx('mt-1 text-sm text-zinc-500', className)} {...props} />;
}

export function ErrorMessage({ className, ...props }: { className?: string; children: ReactNode; id?: string }) {
  return <p role="alert" className={cx('mt-1 text-sm font-medium text-red-600', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, 'min-h-20', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(control, 'pr-8', className)} {...props} />;
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-brand-600 accent-brand-600 focus:ring-brand-600"
        {...props}
      />
      <span>
        <span className="font-medium text-zinc-900">{label}</span>
        {description ? <span className="block text-zinc-500">{description}</span> : null}
      </span>
    </label>
  );
}

export function Fieldset({ legend, children, className }: { legend: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cx('space-y-3', className)}>
      <legend className="text-sm/6 font-semibold text-zinc-900">{legend}</legend>
      {children}
    </fieldset>
  );
}
