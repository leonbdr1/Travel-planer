// Step 1: search frame (F1): start location, drive time, themes, time window,
// travel pattern with live date count, travellers, budget, minimum standard,
// wish chips and free text translated by AI (with the visible AI notice).
import { useCallback, useMemo, useState } from 'react';
import type { LocalityDto, MetaConfigResponse } from '@reiseplaner/contracts';
import { AiLabel, Alert, Button, Card, Chip, Description, ErrorMessage, Fieldset, Input, Label, Select, Textarea } from '@reiseplaner/ui';
import { ApiRequestError } from '../../api/client';
import { de } from '../../i18n/de';
import { AsyncCombobox } from './AsyncCombobox';
import { fetchLocalities, parseWish } from './api';
import { stayDates, toggle, type WizardState } from './state';

const t = de.wizard.frame;
const DRIVE_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360];
const STAR_OPTIONS = [2, 3, 4, 5];
const RATING_OPTIONS = [7, 7.5, 8, 8.5, 9];
const MAX_CHILD_AGE = 17;

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
  const loadLocalities = useCallback(
    (q: string, signal: AbortSignal) => fetchLocalities(q, signal).then((r) => r.items),
    [],
  );

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
      <Card className="space-y-6">
        <div data-origin={state.origin?.geonameid ?? ''}>
          <Label htmlFor="origin">{t.origin}</Label>
          <div className="mt-2">
            <AsyncCombobox<LocalityDto>
              id="origin"
              testId="origin-input"
              value={state.origin}
              onChange={(origin) => update({ origin, regions: null, selectedRegionIds: [], places: [], selectedPlaceIds: [] })}
              load={loadLocalities}
              itemKey={(l) => String(l.geonameid)}
              itemLabel={(l) => l.label}
              placeholder={t.originPlaceholder}
              emptyText={t.originNoResults}
              invalid={touched && originMissing}
              describedBy="origin-hint"
            />
          </div>
          <Description id="origin-hint">{t.originHint}</Description>
          {touched && originMissing ? <ErrorMessage>{t.originRequired}</ErrorMessage> : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="max-drive">{t.maxDrive}</Label>
            <Select
              id="max-drive"
              className="mt-2"
              value={state.maxDriveMinutes ?? ''}
              onChange={(e) =>
                update({ maxDriveMinutes: e.target.value === '' ? null : Number(e.target.value), regions: null, places: [], selectedPlaceIds: [] })
              }
            >
              <option value="">{t.noLimit}</option>
              {DRIVE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t.minutes(m)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Fieldset legend={t.themes}>
          <Description>{t.themesHint}</Description>
          <div className="flex flex-wrap gap-2" data-testid="theme-chips">
            {meta.themes.map((theme) => (
              <Chip
                key={theme.code}
                selected={state.themes.includes(theme.code)}
                onToggle={() => update({ themes: toggle(state.themes, theme.code), regions: null, places: [], selectedPlaceIds: [] })}
              >
                {theme.label}
              </Chip>
            ))}
          </div>
        </Fieldset>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.window}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="window-start">{t.windowStart}</Label>
              <Input
                id="window-start"
                type="date"
                className="mt-2"
                value={state.windowStart}
                onChange={(e) => update({ windowStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="window-end">{t.windowEnd}</Label>
              <Input id="window-end" type="date" className="mt-2" value={state.windowEnd} onChange={(e) => update({ windowEnd: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nights">{t.nights}</Label>
              <Select id="nights" className="mt-2" value={state.nights} onChange={(e) => update({ nights: Number(e.target.value) })}>
                {Array.from({ length: meta.limits.max_nights }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Fieldset>
        <Fieldset legend={t.weekdays}>
          <div className="flex flex-wrap gap-2" data-testid="weekday-chips">
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
        </Fieldset>
        <div aria-live="polite" data-testid="date-count">
          {dates.ok ? (
            <Alert tone="info">
              {t.datesPreview} <strong>{t.dates(dates.dates.length)}</strong>
              {': '}
              {dates.dates
                .slice(0, 4)
                .map((d) => `${d.checkin.slice(8, 10)}.${d.checkin.slice(5, 7)}.`)
                .join(', ')}
              {dates.dates.length > 4 ? ' …' : ''}
            </Alert>
          ) : (
            <Alert tone="error">{dateMessage}</Alert>
          )}
        </div>
      </Card>

      <Card className="space-y-6">
        <Fieldset legend={t.travellers}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="adults">{t.adults}</Label>
              <Select id="adults" className="mt-2" value={state.adults} onChange={(e) => update({ adults: Number(e.target.value) })}>
                {Array.from({ length: meta.limits.max_adults_per_room * state.rooms }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              {touched && adultsInvalid ? <ErrorMessage>{t.errors.adults}</ErrorMessage> : null}
            </div>
            <div>
              <Label htmlFor="rooms">{t.rooms}</Label>
              <Select id="rooms" className="mt-2" value={state.rooms} onChange={(e) => update({ rooms: Number(e.target.value) })}>
                {Array.from({ length: meta.limits.max_rooms }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <span className="block text-sm/6 font-medium text-zinc-900">{t.children}</span>
              {state.childrenAges.map((age, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    aria-label={t.childAge(index + 1)}
                    value={age}
                    onChange={(e) =>
                      update({ childrenAges: state.childrenAges.map((a, i) => (i === index ? Number(e.target.value) : a)) })
                    }
                  >
                    {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => update({ childrenAges: state.childrenAges.filter((_, i) => i !== index) })}>
                    {t.removeChild}
                  </Button>
                </div>
              ))}
              {state.childrenAges.length < meta.limits.max_children_per_room * state.rooms ? (
                <Button variant="secondary" size="sm" onClick={() => update({ childrenAges: [...state.childrenAges, 8] })}>
                  {t.addChild}
                </Button>
              ) : null}
            </div>
          </div>
        </Fieldset>
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
          <div>
            <Label htmlFor="min-stars">{t.minStars}</Label>
            <Select
              id="min-stars"
              className="mt-2"
              value={state.minStars ?? ''}
              onChange={(e) => update({ minStars: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">{t.any}</option>
              {STAR_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {`${n}+`}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="min-rating">{t.minRating}</Label>
            <Select
              id="min-rating"
              className="mt-2"
              value={state.minRating ?? ''}
              onChange={(e) => update({ minRating: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">{t.any}</option>
              {RATING_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {`${n.toLocaleString('de-DE')}+`}
                </option>
              ))}
            </Select>
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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="wish-text">{t.freeText}</Label>
            <AiLabel text={meta.ai_labels.wish_parse ?? ''} />
          </div>
          <Textarea
            id="wish-text"
            maxLength={meta.limits.wish_text_max_chars}
            placeholder={t.freeTextPlaceholder}
            value={state.wishText}
            onChange={(e) => update({ wishText: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={!state.wishText.trim() || wishStatus === 'loading'} onClick={translate} data-testid="translate-wish">
              {wishStatus === 'loading' ? t.translating : t.translate}
            </Button>
            <span className="text-xs text-zinc-500">
              {state.wishText.length}/{meta.limits.wish_text_max_chars}
            </span>
          </div>
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
        <Button variant="ghost" onClick={() => next(true)}>
          {t.direct}
        </Button>
      </div>
    </form>
  );
}
