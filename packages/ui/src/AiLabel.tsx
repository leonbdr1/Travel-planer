import { SparklesIcon } from '@heroicons/react/16/solid';
import { cx } from './cx';

export type AiProvenance = 'ai_assisted' | 'ai_generated';

/**
 * Visible and machine-readable AI label (EU AI Act Art. 50, konzept.md 7.8).
 * Every surface with an AI share renders this component; tests look for
 * `data-ai-provenance` on every page.
 */
export function AiLabel({
  text,
  provenance = 'ai_assisted',
  className,
}: {
  text: string;
  provenance?: AiProvenance;
  className?: string;
}) {
  return (
    <span
      data-ai-provenance={provenance}
      className={cx(
        'inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-200',
        className,
      )}
    >
      <SparklesIcon aria-hidden="true" className="size-3.5" />
      {text}
    </span>
  );
}
