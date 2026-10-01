// Step 1: search frame (F1, F15). On top "Wohin soll es gehen?": places
// suggested from a start location and drive time and/or picked by name (one or
// both; the input decides, no tick boxes: an empty box is tinted grey, a filled
// one in the brand colour), and below it, joined, the bar with arrival,
// departure (calendar) and travellers that counts for both. Then the travel pattern with live date count, themes, budget,
// goal (one tap), wish chips and free text translated by AI (with the visible
// AI notice). Stars and rating minimums are "Weitere Filter" in the results.
import { useEffect, useMemo, useState } from 'react';
import type { MetaConfigResponse } from '@reiseplaner/contracts';
import { AiLabel, Alert, Button, Card, Chip, Description, ErrorMessage, Fieldset, Heading, Input, Label, Select, Textarea, cx } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { GoalSwitch } from '../../components/GoalSwitch';
import { de } from '../../i18n/de';
import { parseWish, resolvePlace } from './api';
import { OwnPlacesPicker } from './OwnPlacesPicker';
import { DateTravellersBar, OriginFields, OwnOriginField } from './SearchBar';
import { ownPlacesStart, resetSuggestions, stayDates, toggle, wantsSuggestions, type WizardState } from './state';

const t = de.wizard.frame;
const o = de.wizard.ownPlaces;

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

/** Filled way: brand tint. Empty way: a light grey that still reads as "type here", not as disabled. */
function wayTone(active: boolean): string {
  return active ? 'bg-brand-50 ring-brand-300' : 'bg-zinc-50 ring-zinc-200';
}

function WayHeading({ active, title, text }: { active: boolean; title: string; text: string }) {
  return (
    <div>
      <p className={cx('text-base font-semibold', active ? 'text-zinc-950' : 'text-zinc-600')}>{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{text}</p>
    </div>
  );
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
  const suggest = wantsSuggestions(state);
  const pickOwn = state.ownPlaces.length > 0;
  // A start location or at least one own place: otherwise there is nowhere to search.
  const nowhere = !suggest && !pickOwn;
  const adultsInvalid = state.adults < 1;
  const aiOff = !meta.llm_enabled;

  // Own places picked before the start location changed get their drive times again.
  const originId = ownPlacesStart(state)?.geonameid ?? null;
  useEffect(() => {
    if (state.ownPlaces.length === 0 || state.ownPlacesOrigin === originId) return;
    let cancelled = false;
    Promise.all(state.ownPlaces.map((p) => (p.geonameid !== null ? resolvePlace(p.geonameid, originId).then((r) => r.place) : Promise.resolve(p))))
      .then((ownPlaces) => {
        if (!cancelled) update({ ownPlaces, ownPlacesOrigin: originId });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [originId, state.ownPlacesOrigin, state.ownPlaces.length]);

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

  function next() {
    setTouched(true);
    if (nowhere || adultsInvalid || !dates.ok) return;
    if (suggest) onNext();
    else onDirect();
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      <Card className="space-y-5" data-testid="where">
        <Heading level={2}>{de.wizard.ownPlaces.title}</Heading>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cx('space-y-3 rounded-lg p-4 ring-1 transition-colors', wayTone(suggest))} data-testid="way-suggest" data-active={suggest}>
            <WayHeading active={suggest} title={o.suggestTitle} text={o.suggestText} />
            <OriginFields state={state} update={update} invalid={touched && nowhere} />
          </div>
          <div className={cx('space-y-3 rounded-lg p-4 ring-1 transition-colors', wayTone(pickOwn))} data-testid="way-own" data-active={pickOwn}>
            <WayHeading active={pickOwn} title={o.pickTitle} text={o.pickText} />
            <OwnPlacesPicker
              places={state.ownPlaces}
              origin={ownPlacesStart(state)?.geonameid ?? null}
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
            <OwnOriginField state={state} update={update} />
          </div>
        </div>
        {touched && nowhere ? <ErrorMessage>{o.needOne}</ErrorMessage> : null}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-900">{o.whenTitle}</p>
          <DateTravellersBar state={state} update={update} meta={meta} />
        </div>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.pattern}>
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
              {state.nightsMax > state.nights ? <Description>{t.nightsRangeHint(state.nights, state.nightsMax)}</Description> : null}
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
          </div>
          <div className="space-y-2 sm:col-span-2" data-testid="goal">
            <p className="text-sm/6 font-medium text-zinc-950">{de.goals.label}</p>
            <GoalSwitch value={state.goal} onChange={(goal) => update({ goal })} />
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
          {suggest ? t.next : t.nextPlaces}
        </Button>
      </div>
    </form>
  );
}
