// Search wizard (F1–F3): frame → regions → places → confirmation.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { ApiRequestError } from '../api/client';
import { toSearchRequest } from '../features/search/request';
import { startSearch } from '../features/search/run-api';
import { StepFrame } from '../features/search/StepFrame';
import { StepPlaces } from '../features/search/StepPlaces';
import { StepRegions } from '../features/search/StepRegions';
import { allPlaces, loadState, resetSuggestions, saveState, stayDates, type WizardState } from '../features/search/state';
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

function StartSearch({ state, onBack }: { state: WizardState; onBack: () => void }) {
  const navigate = useNavigate();
  const r = de.searchRun;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    const request = toSearchRequest(state);
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      const created = await startSearch(request);
      navigate(`/suche/${created.search_id}#t=${created.token}`);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiRequestError && err.status === 429) setError(r.errors.rate_limited);
      else if (err instanceof ApiRequestError && err.status === 402) setError(r.errors.quota);
      else if (err instanceof ApiRequestError && err.code !== 'http_error') setError(err.message);
      else setError(r.errors.generic);
    }
  }
  return (
    <Card className="space-y-4" data-testid="places-confirmed">
      <Heading level={2}>{r.startTitle}</Heading>
      <Text>{r.startLead}</Text>
      <ul className="list-inside list-disc text-sm text-zinc-700">
        {allPlaces(state)
          .filter((p) => state.selectedPlaceIds.includes(p.id))
          .map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
      </ul>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          {de.common.back}
        </Button>
        <Button size="lg" disabled={busy} onClick={() => void start()} data-testid="start-search">
          {busy ? r.starting : r.start}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">{r.altchaNote}</p>
    </Card>
  );
}

export function Search() {
  const meta = useMeta();
  const [state, setState] = useState<WizardState>(() => loadState());
  useEffect(() => {
    saveState(state);
  }, [state]);
  // Braces matter: current browsers return a promise from scrollTo, and an effect may only return a cleanup function.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);
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
          onDirect={() => update({ step: 3, direct: true, ...resetSuggestions(state) })}
        />
      ) : null}
      {state.step === 2 ? (
        <StepRegions
          state={state}
          update={update}
          meta={m}
          onBack={() => update({ step: 1 })}
          onNext={() => update({ step: 3, direct: false })}
          onSkip={() => update({ step: 3, direct: true, ...resetSuggestions(state) })}
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
        <>
          <Card className="space-y-1">
            <Heading level={2}>{t.places.confirmedTitle}</Heading>
            <Text className="font-medium" data-testid="combination-summary">
              {t.places.combinations(state.selectedPlaceIds.length, dates.ok ? dates.dates.length : 0)}
            </Text>
          </Card>
          <StartSearch state={state} onBack={() => update({ step: 3 })} />
        </>
      ) : null}
    </div>
  );
}
