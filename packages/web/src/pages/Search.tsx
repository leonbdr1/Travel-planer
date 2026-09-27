// Search wizard (F1–F3): frame → regions → places → confirmation.
import { useEffect, useState } from 'react';
import { Alert, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { StepFrame } from '../features/search/StepFrame';
import { StepPlaces } from '../features/search/StepPlaces';
import { StepRegions } from '../features/search/StepRegions';
import { loadState, saveState, stayDates, type WizardState } from '../features/search/state';
import { de } from '../i18n/de';
import { useMeta } from '../lib/meta';

const t = de.wizard;

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label={t.stepOf(Math.min(step, 3), 3)}>
      {t.steps.map((label, index) => {
        const n = index + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cx(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium',
                active ? 'bg-brand-600 text-brand-contrast' : done ? 'bg-brand-50 text-brand-800' : 'bg-zinc-100 text-zinc-500',
              )}
            >
              <span className="tabular-nums">{n}</span> {label}
            </span>
            {n < t.steps.length ? <span className="text-zinc-300">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function Search() {
  const meta = useMeta();
  const [state, setState] = useState<WizardState>(() => loadState());
  useEffect(() => saveState(state), [state]);
  useEffect(() => window.scrollTo({ top: 0 }), [state.step]);
  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  if (meta.status === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Spinner label={de.common.loading} />
      </div>
    );
  }
  if (meta.status === 'error') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Alert tone="error">{de.status.apiUnreachable}</Alert>
      </div>
    );
  }
  const m = meta.meta;
  const dates = stayDates(state, m);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-brand-700" data-testid="step-of">
            {t.stepOf(Math.min(state.step, 3), 3)}
          </p>
          <Heading level={1}>{t.title}</Heading>
        </div>
        <StepIndicator step={state.step} />
      </div>
      {state.step === 1 ? (
        <StepFrame
          state={state}
          update={update}
          meta={m}
          onNext={() => update({ step: 2, direct: false })}
          onDirect={() => update({ step: 3, direct: true, selectedRegionIds: [] })}
        />
      ) : null}
      {state.step === 2 ? (
        <StepRegions
          state={state}
          update={update}
          meta={m}
          onBack={() => update({ step: 1 })}
          onNext={() => update({ step: 3, direct: false })}
          onSkip={() => update({ step: 3, direct: true, selectedRegionIds: [], places: [], selectedPlaceIds: [] })}
        />
      ) : null}
      {state.step === 3 ? (
        <StepPlaces
          state={state}
          update={update}
          meta={m}
          onBack={() => update({ step: state.direct ? 1 : 2 })}
          onConfirm={() => update({ step: 4 })}
        />
      ) : null}
      {state.step === 4 ? (
        <Card className="space-y-3" data-testid="places-confirmed">
          <Heading level={2}>{t.places.confirmedTitle}</Heading>
          <Text>{t.places.confirmedText}</Text>
          <Text className="font-medium">
            {t.places.combinations(state.selectedPlaceIds.length, dates.ok ? dates.dates.length : 0)}
          </Text>
          <ul className="list-inside list-disc text-sm text-zinc-700">
            {state.places
              .filter((p) => state.selectedPlaceIds.includes(p.id))
              .map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
          </ul>
          <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => update({ step: 3 })}>
            {de.common.back}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
