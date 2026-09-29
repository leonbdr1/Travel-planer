// Step 2: region suggestions (F2) with reasons; one or more can be chosen,
// or the step is skipped to enter places directly.
import { useEffect, useState } from 'react';
import type { MetaConfigResponse, RegionSuggestionDto } from '@reiseplaner/contracts';
import { AiLabel, Alert, Button, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { de } from '../../i18n/de';
import { AttractivenessBadge } from './AttractivenessBadge';
import { fetchRegions } from './api';
import { catalogLabel } from './labels';
import { toggle, type WizardState, keepOwnSelection } from './state';

const t = de.wizard.regions;
const MAX_REGIONS = 5;

export function StepRegions({
  state,
  update,
  meta,
  onBack,
  onNext,
  onSkip,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  meta: MetaConfigResponse;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [touched, setTouched] = useState(false);
  const origin = state.origin;
  const needsLoad = state.regions === null;

  useEffect(() => {
    if (!origin || !needsLoad) return;
    let cancelled = false;
    setError(null);
    fetchRegions({ origin: { geonameid: origin.geonameid }, max_drive_minutes: state.maxDriveMinutes, themes: state.themes })
      .then((res) => {
        if (cancelled) return;
        setEstimated(res.travel_times.estimated > 0);
        update({ regions: res.regions, selectedRegionIds: res.regions.slice(0, 1).map((r) => r.id) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
      });
    return () => {
      cancelled = true;
    };
  }, [origin?.geonameid, needsLoad, attempt]);

  const regions: RegionSuggestionDto[] = state.regions ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Heading level={2}>{t.title}</Heading>
        <Text>{t.lead}</Text>
      </div>
      {error ? (
        <Alert tone="error">
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={() => setAttempt((a) => a + 1)}>
            {de.common.retry}
          </Button>
        </Alert>
      ) : null}
      {state.regions === null && !error ? <Spinner label={t.loading} /> : null}
      {estimated ? <Alert tone="warning">{t.estimated}</Alert> : null}
      {state.regions !== null && regions.length === 0 ? <Alert tone="info">{t.empty}</Alert> : null}
      <ul className="grid gap-4 md:grid-cols-2" data-testid="region-list">
        {regions.map((region) => {
          const selected = state.selectedRegionIds.includes(region.id);
          const full = !selected && state.selectedRegionIds.length >= MAX_REGIONS;
          return (
            <li key={region.id} className="relative">
              <button
                type="button"
                aria-pressed={selected}
                disabled={full}
                data-testid="region-card"
                onClick={() => update({ selectedRegionIds: toggle(state.selectedRegionIds, region.id), places: [], selectedPlaceIds: keepOwnSelection(state) })}
                className={cx(
                  'block h-full w-full rounded-xl bg-white p-5 text-left shadow-sm ring-1 transition',
                  region.attractiveness && 'pb-14',
                  selected ? 'ring-2 ring-brand-600' : 'ring-zinc-200 hover:ring-zinc-300',
                  full && 'opacity-50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Heading level={3}>{region.name}</Heading>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded border text-xs',
                      selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300',
                    )}
                  >
                    {selected ? '✓' : ''}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-brand-800" data-testid="region-reason">
                  {region.reason}
                </p>
                <p className="mt-2 text-sm text-zinc-600">{region.description}</p>
                {region.ai_assisted ? <AiLabel className="mt-3" text={catalogLabel(meta, region.verified)} /> : null}
              </button>
              {region.attractiveness ? (
                // Outside the card's button (no button inside a button); sits on the card's last line.
                <div className="absolute bottom-4 left-5">
                  <AttractivenessBadge
                    level={region.attractiveness.level}
                    score={region.attractiveness.score}
                    topPlaces={region.attractiveness.top_places}
                    name={region.name}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {touched && state.selectedRegionIds.length === 0 ? <Alert tone="error">{t.selectAtLeastOne}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          {de.common.back}
        </Button>
        <Button
          size="lg"
          data-testid="regions-next"
          disabled={state.regions === null}
          onClick={() => {
            setTouched(true);
            if (state.selectedRegionIds.length > 0) onNext();
          }}
        >
          {t.next}
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          {t.skip}
        </Button>
      </div>
    </div>
  );
}
