// Goal switch (F15): one tap, three goals, a one-line hint. Used in the search
// form and above the finale (switching needs no new search).
import { GOALS, type Goal } from '@reiseplaner/domain';
import { cx } from '@reiseplaner/ui';
import { de } from '../i18n/de';

export function GoalSwitch({ value, onChange }: { value: Goal; onChange: (goal: Goal) => void }) {
  return (
    <div className="space-y-1">
      <div
        role="radiogroup"
        aria-label={de.goals.label}
        className="inline-flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-zinc-200"
        data-testid="goal-switch"
      >
        {GOALS.map((goal) => (
          <button
            key={goal}
            type="button"
            role="radio"
            aria-checked={value === goal}
            data-goal={goal}
            onClick={() => onChange(goal)}
            className={cx(
              'rounded-md px-2 py-1.5 text-[13px] font-medium sm:px-3 sm:text-sm',
              value === goal ? 'bg-brand-600 text-brand-contrast' : 'text-zinc-700 hover:bg-zinc-50',
            )}
          >
            {de.goals.names[goal]}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500" data-testid="goal-hint">
        {de.goals.hints[value]}
      </p>
    </div>
  );
}
