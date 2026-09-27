// Step 3: place suggestions and place list (F3): drive time, description
// (AI label), own places (no drive-time filter), counter "x von 10", and the
// explicit confirmation before the search starts.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LocalityDto, MetaConfigResponse, PlaceDto } from '@reiseplaner/contracts';
import { checkCombinations } from '@reiseplaner/domain';
import { AiLabel, Alert, Badge, Button, Card, Heading, Label, Spinner, Text, cx } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { de } from '../../i18n/de';
import { AsyncCombobox } from './AsyncCombobox';
import { fetchPlaces, resolvePlace, searchPlaces } from './api';
import { catalogLabel, formatMinutes } from './labels';
import { stayDates, toggle, type WizardState } from './state';

const t = de.wizard.places;

type SearchHit = { kind: 'place'; place: PlaceDto } | { kind: 'locality'; locality: LocalityDto };

function PlaceRow({
  place,
  selected,
  disabled,
  meta,
  onToggle,
}: {
  place: PlaceDto;
  selected: boolean;
  disabled: boolean;
  meta: MetaConfigResponse;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        data-testid="place-row"
        className={cx(
          'flex cursor-pointer gap-4 rounded-xl bg-white p-4 shadow-sm ring-1',
          selected ? 'ring-2 ring-brand-600' : 'ring-zinc-200',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-brand-600"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-950">{place.name}</span>
            {place.kind === 'user' ? <Badge tone="neutral">{t.userPlace}</Badge> : null}
            <span className="text-sm text-zinc-600" data-testid="place-drive">
              {place.minutes === null
                ? t.noDrive
                : `${t.drive} ${formatMinutes(place.minutes)}${place.estimated ? ` (${t.estimated})` : ''}`}
            </span>
          </div>
          {place.description ? <p className="text-sm text-zinc-600">{place.description}</p> : null}
          <div className="flex flex-wrap items-center gap-1.5">
            {place.themes.slice(0, 5).map((theme) => (
              <Badge key={theme.code} tone={place.matched_themes.includes(theme.code) ? 'brand' : 'neutral'}>
                {theme.label}
              </Badge>
            ))}
            {place.description && place.ai_assisted ? <AiLabel text={catalogLabel(meta, place.verified)} /> : null}
          </div>
        </div>
      </label>
    </li>
  );
}

export function StepPlaces({
  state,
  update,
  meta,
  onBack,
  onConfirm,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  meta: MetaConfigResponse;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const max = meta.limits.max_places;
  const origin = state.origin;
  const needsLoad = !state.direct && state.places.length === 0 && state.selectedRegionIds.length > 0;

  useEffect(() => {
    if (!origin || !needsLoad) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlaces({
      origin: { geonameid: origin.geonameid },
      max_drive_minutes: state.maxDriveMinutes,
      themes: state.themes,
      region_ids: state.selectedRegionIds,
    })
      .then((res) => {
        if (cancelled) return;
        const places = res.regions.flatMap((r) => r.places);
        // Preselect the best places of every region, at most `max` in total.
        const perRegion = Math.max(1, Math.floor(max / Math.max(1, res.regions.length)));
        const preselected = res.regions.flatMap((r) => r.places.slice(0, perRegion).map((p) => p.id)).slice(0, max);
        update({ places, selectedPlaceIds: preselected });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin?.geonameid, needsLoad]);

  const dates = useMemo(() => stayDates(state, meta), [state, meta]);
  const dateCount = dates.ok ? dates.dates.length : 0;
  const selectedCount = state.selectedPlaceIds.length;
  const combos = checkCombinations(selectedCount, dateCount, meta.limits.max_combinations);

  const loadHits = useCallback(
    async (q: string, signal: AbortSignal): Promise<SearchHit[]> => {
      const res = await searchPlaces(q, origin?.geonameid ?? null, signal);
      return [
        ...res.catalog.map((place) => ({ kind: 'place' as const, place })),
        ...res.localities.map((locality) => ({ kind: 'locality' as const, locality })),
      ];
    },
    [origin?.geonameid],
  );

  async function addHit(hit: SearchHit | null) {
    if (!hit) return;
    try {
      let place: PlaceDto;
      if (hit.kind === 'place') {
        place = hit.place;
      } else {
        place = (await resolvePlace(hit.locality.geonameid, origin?.geonameid ?? null)).place;
      }
      const places = state.places.some((p) => p.id === place.id) ? state.places : [...state.places, place];
      const selected = state.selectedPlaceIds.includes(place.id) || selectedCount >= max ? state.selectedPlaceIds : [...state.selectedPlaceIds, place.id];
      update({ places, selectedPlaceIds: selected });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : de.status.apiUnreachable);
    }
  }

  const byRegion = new Map<string, PlaceDto[]>();
  for (const p of state.places) {
    const key = p.region_name ?? t.userPlace;
    byRegion.set(key, [...(byRegion.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Heading level={2}>{t.title}</Heading>
        <Text>{t.lead}</Text>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Spinner label={t.loading} /> : null}

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/95 px-4 py-3 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
        <span className="text-sm font-semibold text-zinc-900" data-testid="place-counter">
          {t.counter(selectedCount, max)}
        </span>
        <span className="text-sm text-zinc-600" data-testid="combination-count">
          {t.combinations(selectedCount, dateCount)}
        </span>
      </div>

      {[...byRegion.entries()].map(([region, places]) => (
        <section key={region} className="space-y-3">
          <Heading level={3}>{region}</Heading>
          <ul className="space-y-3">
            {places.map((place) => {
              const selected = state.selectedPlaceIds.includes(place.id);
              return (
                <PlaceRow
                  key={place.id}
                  place={place}
                  meta={meta}
                  selected={selected}
                  disabled={!selected && selectedCount >= max}
                  onToggle={() => update({ selectedPlaceIds: toggle(state.selectedPlaceIds, place.id) })}
                />
              );
            })}
          </ul>
        </section>
      ))}

      <Card className="space-y-2">
        <Label htmlFor="own-place">{t.ownPlace}</Label>
        <AsyncCombobox<SearchHit>
          id="own-place"
          testId="own-place-input"
          value={null}
          clearOnSelect
          onChange={(hit) => void addHit(hit)}
          load={loadHits}
          itemKey={(h) => (h.kind === 'place' ? `p-${h.place.id}` : `l-${h.locality.geonameid}`)}
          itemLabel={(h) => (h.kind === 'place' ? h.place.name : h.locality.label)}
          renderItem={(h) =>
            h.kind === 'place' ? (
              <span>
                {h.place.name} <span className="text-zinc-500">({h.place.region_name ?? ''})</span>
              </span>
            ) : (
              <span>{h.locality.label}</span>
            )
          }
          placeholder={t.ownPlacePlaceholder}
          emptyText={de.wizard.frame.originNoResults}
        />
        <p className="text-sm text-zinc-500">{t.ownPlaceHint}</p>
      </Card>

      {selectedCount >= max ? <Alert tone="info">{t.maxReached(max)}</Alert> : null}
      {!combos.ok ? <Alert tone="error">{t.tooMany(combos.count, meta.limits.max_combinations)}</Alert> : null}
      {touched && selectedCount === 0 ? <Alert tone="error">{t.noneSelected}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          {de.common.back}
        </Button>
        <Button
          size="lg"
          data-testid="places-confirm"
          disabled={!combos.ok || !dates.ok}
          onClick={() => {
            setTouched(true);
            if (selectedCount > 0 && combos.ok) onConfirm();
          }}
        >
          {t.confirm}
        </Button>
      </div>
    </div>
  );
}
