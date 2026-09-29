// Step 1: search frame (F1, F15). On top the search bar known from booking
// sites (start location, drive time, arrival and departure in a calendar,
// travellers); below the travel pattern with live date count, themes, budget,
// goal (one tap), wish chips and free text translated by AI (with the visible
// AI notice). Stars and rating minimums are "Weitere Filter" in the results.
import { useMemo, useState } from 'react';
import type { MetaConfigResponse } from '@reiseplaner/contracts';
import { MapPinIcon, SparklesIcon } from '@heroicons/react/20/solid';
import { AiLabel, Alert, Button, Card, Chip, Description, Fieldset, Heading, Input, Label, Select, Textarea, cx } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { GoalSwitch } from '../../components/GoalSwitch';
import { de } from '../../i18n/de';
import { parseWish } from './api';
import { OwnPlacesPicker } from './OwnPlacesPicker';
import { SearchBar } from './SearchBar';
import { resetSuggestions, stayDates, toggle, type WizardState } from './state';

const t = de.wizard.frame;

type Update = (patch: Partial<WizardState>) => void;

export function dateError(result: ReturnType<typeof stayDates>, meta: MetaConfigResponse): string | null {
  if (result.ok) return null;
  const e = t.errors;
  switch (result.error) {
    case 'invalid_nights':
      return e.invalid_nights(meta.limits.max_nights);
    case 'window_too_long':
      return e.window_too_long(meta.limits.max_window_days);
    case 'too_many_dates':
      return e.too_many_dates(result.count ?? 0, meta.limits.max_dates);
    default:
      return e[result.error];
  }
}

export function StepFrame({
  state,
  update,
  meta,
  onNext,
  onDirect,
}: {
  state: WizardState;
  update: Update;
  meta: MetaConfigResponse;
  onNext: () => void;
  onDirect: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const [wishStatus, setWishStatus] = useState<'idle' | 'loading' | 'done' | 'fallback'>('idle');
  const [wishNotice, setWishNotice] = useState<string | null>(null);
  const dates = useMemo(() => stayDates(state, meta), [state, meta]);
  const dateMessage = dateError(dates, meta);
  const originMissing = state.origin === null;
  const adultsInvalid = state.adults < 1;
  const aiOff = !meta.llm_enabled;

  async function translate() {
    const text = state.wishText.trim();
    if (!text) return;
    setWishStatus('loading');
    try {
      const result = await parseWish(text);
      if (!result.translated) {
        setWishStatus('fallback');
        setWishNotice(result.notice);
        return;
      }
      update({
        chips: [...new Set([...state.chips, ...result.chips])],
        themes: [...new Set([...state.themes, ...result.themes])],
        unmatched: result.unmatched,
      });
      setWishStatus('done');
      setWishNotice(null);
    } catch (err) {
      setWishStatus('fallback');
      setWishNotice(err instanceof ApiRequestError ? err.message : null);
    }
  }

  function next(direct: boolean) {
    setTouched(true);
    if (originMissing || adultsInvalid || !dates.ok) return;
    if (direct) onDirect();
    else onNext();
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        next(false);
      }}
      noValidate
    >
      <SearchBar state={state} update={update} meta={meta} touched={touched} />

      <Card className="space-y-4" data-testid="where">
        <Heading level={2}>{de.wizard.ownPlaces.title}</Heading>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <SparklesIcon aria-hidden="true" className="size-5 text-brand-600" />
              {de.wizard.ownPlaces.suggestTitle}
            </p>
            <p className="text-sm text-zinc-600">{de.wizard.ownPlaces.suggestText}</p>
          </div>
          <div className="space-y-2 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
            <label htmlFor="own-places-input" className="flex items-center gap-2 font-semibold text-zinc-900">
              <MapPinIcon aria-hidden="true" className="size-5 text-brand-600" />
              {de.wizard.ownPlaces.pickTitle}
            </label>
            <p className="text-sm text-zinc-600">{de.wizard.ownPlaces.pickText}</p>
            <OwnPlacesPicker
              places={state.ownPlaces}
              origin={state.origin?.geonameid ?? null}
              max={meta.limits.max_places}
              onChange={(ownPlaces, ownPlacesOrigin) => {
                const removed = state.ownPlaces.filter((p) => !ownPlaces.some((x) => x.id === p.id)).map((p) => p.id);
                const added = ownPlaces.filter((p) => !state.ownPlaces.some((x) => x.id === p.id)).map((p) => p.id);
                update({
                  ownPlaces,
                  ownPlacesOrigin,
                  selectedPlaceIds: [...state.selectedPlaceIds.filter((id) => !removed.includes(id)), ...added.filter((id) => !state.selectedPlaceIds.includes(id))],
                });
              }}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.pattern}>
          <Description>{t.patternHint}</Description>
          <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
            <div>
              <span className="block text-sm/6 font-medium text-zinc-900">{t.nights}</span>
              <div className="mt-2 flex items-center gap-2" data-testid="nights-range">
                <Select
                  id="nights"
                  aria-label={t.nightsFrom}
                  value={state.nights}
                  onChange={(e) => {
                    const nights = Number(e.target.value);
                    update({ nights, nightsMax: Math.max(nights, state.nightsMax) });
                  }}
                >
                  {Array.from({ length: meta.limits.max_nights }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span className="text-sm text-zinc-600">{t.nightsTo}</span>
                <Select
                  id="nights-max"
                  aria-label={t.nightsUpTo}
                  value={Math.max(state.nights, state.nightsMax)}
                  onChange={(e) => update({ nightsMax: Number(e.target.value) })}
                >
                  {Array.from({ length: meta.limits.max_nights - state.nights + 1 }, (_, i) => state.nights + i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <Description>{state.nightsMax > state.nights ? t.nightsRangeHint(state.nights, state.nightsMax) : t.nightsFixedHint}</Description>
            </div>
            <div>
              <span className="block text-sm/6 font-medium text-zinc-900">{t.weekdays}</span>
              <div className="mt-2 flex flex-wrap gap-2" data-testid="weekday-chips">
                {t.weekdayNames.map((name, index) => (
                  <Chip
                    key={name}
                    title={t.weekdayLong[index] ?? name}
                    selected={state.weekdays.includes(index + 1)}
                    onToggle={() => update({ weekdays: toggle(state.weekdays, index + 1).sort() })}
                  >
                    {name}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Fieldset>
        <div aria-live="polite" data-testid="date-count">
          {dates.ok ? (
            <Alert tone="info">
              {t.datesPreview} <strong>{t.dates(dates.dates.length)}</strong>
              {': '}
              {dates.dates
                .slice(0, 4)
                .map((d) =>
                  state.nightsMax > state.nights
                    ? `${d.checkin.slice(8, 10)}.${d.checkin.slice(5, 7)}.–${d.checkout.slice(8, 10)}.${d.checkout.slice(5, 7)}.`
                    : `${d.checkin.slice(8, 10)}.${d.checkin.slice(5, 7)}.`,
                )
                .join(', ')}
              {dates.dates.length > 4 ? ' …' : ''}
            </Alert>
          ) : (
            <Alert tone="error">{dateMessage}</Alert>
          )}
        </div>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.themes}>
          <Description>{t.themesHint}</Description>
          <div className="flex flex-wrap gap-2" data-testid="theme-chips">
            {meta.themes.map((theme) => (
              <Chip
                key={theme.code}
                selected={state.themes.includes(theme.code)}
                onToggle={() => update({ themes: toggle(state.themes, theme.code), ...resetSuggestions(state) })}
              >
                {theme.label}
              </Chip>
            ))}
          </div>
        </Fieldset>
      </Card>

      <Card className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label htmlFor="budget">{t.budget}</Label>
            <Input
              id="budget"
              type="number"
              min={1}
              inputMode="numeric"
              className="mt-2"
              value={state.budgetEur ?? ''}
              onChange={(e) => update({ budgetEur: e.target.value === '' ? null : Math.max(1, Math.round(Number(e.target.value))) })}
            />
            <Description>{t.budgetHint}</Description>
          </div>
          <div className="space-y-2 sm:col-span-2" data-testid="goal">
            <p className="text-sm/6 font-medium text-zinc-950">{de.goals.label}</p>
            <GoalSwitch value={state.goal} onChange={(goal) => update({ goal })} />
            <Description>{t.goalHint}</Description>
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.chips}>
          <div className="flex flex-wrap gap-2" data-testid="wish-chips">
            {meta.chips.map((chip) => (
              <Chip key={chip.code} selected={state.chips.includes(chip.code)} onToggle={() => update({ chips: toggle(state.chips, chip.code) })}>
                {chip.label}
              </Chip>
            ))}
          </div>
        </Fieldset>
        <div className={cx('space-y-2', aiOff && 'opacity-60')} data-testid="wish-free-text" data-ai-off={aiOff || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="wish-text">{t.freeText}</Label>
            <AiLabel text={meta.ai_labels.wish_parse ?? ''} />
          </div>
          <Textarea
            id="wish-text"
            maxLength={meta.limits.wish_text_max_chars}
            placeholder={aiOff ? '' : t.freeTextPlaceholder}
            disabled={aiOff}
            value={state.wishText}
            onChange={(e) => update({ wishText: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={aiOff || !state.wishText.trim() || wishStatus === 'loading'} onClick={translate} data-testid="translate-wish">
              {wishStatus === 'loading' ? t.translating : t.translate}
            </Button>
            <span className="text-xs text-zinc-500">
              {state.wishText.length}/{meta.limits.wish_text_max_chars}
            </span>
          </div>
          {aiOff ? (
            <p className="text-sm text-zinc-600" data-testid="wish-ai-off">
              {meta.dev_settings ? t.aiOffDev : t.aiOff}
            </p>
          ) : null}
          {wishStatus === 'done' ? <Alert tone="success">{t.translated}</Alert> : null}
          {wishStatus === 'fallback' && wishNotice ? <Alert tone="warning">{wishNotice}</Alert> : null}
          {state.unmatched.length > 0 ? (
            <div data-testid="unmatched">
              <Alert tone="info">
                <strong>{t.unmatched}</strong> {state.unmatched.map((u) => `„${u}“`).join(', ')}. {t.unmatchedHint}
              </Alert>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" data-testid="frame-next">
          {t.next}
        </Button>
        {state.ownPlaces.length > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => next(true)} data-testid="own-only">
            {de.wizard.ownPlaces.onlyMine(state.ownPlaces.length)}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => next(true)}>
            {t.direct}
          </Button>
        )}
      </div>
    </form>
  );
}
