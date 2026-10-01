// Building blocks of the search frame: the start location and drive time
// fields (part of "Orte vorschlagen lassen") and the bar with arrival,
// departure (calendar popover) and travellers that sits below "Wohin soll es
// gehen?" and counts for both ways to a place.
import { useCallback } from 'react';
import { ClockIcon, MapPinIcon, PaperAirplaneIcon, TruckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import type { LocalityDto, MetaConfigResponse } from '@reiseplaner/contracts';
import { CONTINENT_CODES, CONTINENT_LABELS, type ContinentCode } from '@reiseplaner/domain';
import { Chip, ErrorMessage, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { AsyncCombobox } from './AsyncCombobox';
import { fetchLocalities } from './api';
import { DateRangePicker } from './DateRangePicker';
import { resetSuggestions, todayIso, type WizardState } from './state';
import { TravellersPicker } from './TravellersPicker';

const t = de.wizard.frame;
// Up to 7 h in fine steps, then the coarse blocks of Aufgabe F16 (10, 20, 30 h); "egal" = all of Europe.
export const DRIVE_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360, 420, 600, 1200, 1800];
// Optional flight time limit in hours (F19).
export const FLIGHT_HOURS_OPTIONS = [2, 3, 4, 5, 6, 8, 12];

type Update = (patch: Partial<WizardState>) => void;

/** Car or plane (F19): the way the suggested places are found. Flights are only shown, never sold. */
function TravelModeSwitch({ state, update }: { state: WizardState; update: Update }) {
  const options = [
    { mode: 'car', label: t.modeCar, icon: <TruckIcon aria-hidden="true" className="size-4" /> },
    { mode: 'flight', label: t.modeFlight, icon: <PaperAirplaneIcon aria-hidden="true" className="size-4" /> },
  ] as const;
  return (
    <div role="radiogroup" aria-label={t.travelMode} className="flex gap-1 rounded-lg bg-zinc-100 p-1" data-testid="travel-mode">
      {options.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={state.travelMode === o.mode}
          data-testid={`mode-${o.mode}`}
          onClick={() => state.travelMode !== o.mode && update({ travelMode: o.mode, ...resetSuggestions(state) })}
          className={cx(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
            state.travelMode === o.mode ? 'bg-white text-brand-800 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Flight mode: continents to tick, flight time optional. */
function FlightFields({ state, update }: { state: WizardState; update: Update }) {
  const toggleContinent = (code: ContinentCode) =>
    update({ continents: state.continents.includes(code) ? state.continents.filter((c) => c !== code) : [...state.continents, code], ...resetSuggestions(state) });
  return (
    <div className="space-y-2" data-testid="flight-fields">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">
          {t.continents} <span className="font-normal text-zinc-500">({t.continentsHint})</span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-2" data-testid="continent-chips">
          {CONTINENT_CODES.map((code) => (
            <Chip key={code} selected={state.continents.includes(code)} onToggle={() => toggleContinent(code)}>
              {CONTINENT_LABELS[code]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Cell label={t.maxFlight} htmlFor="max-flight" icon={<ClockIcon aria-hidden="true" className="size-5" />}>
        <select
          id="max-flight"
          title={t.maxFlightTitle}
          className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-sm/6 font-semibold text-zinc-950 focus:ring-0 focus:outline-none"
          value={state.maxFlightMinutes ?? ''}
          onChange={(e) => update({ maxFlightMinutes: e.target.value === '' ? null : Number(e.target.value), ...resetSuggestions(state) })}
        >
          <option value="">{t.flightNoLimit}</option>
          {FLIGHT_HOURS_OPTIONS.map((h) => (
            <option key={h} value={h * 60}>
              {t.flightUpTo(h)}
            </option>
          ))}
        </select>
      </Cell>
      <p className="text-sm text-zinc-500">{t.flightHint}</p>
    </div>
  );
}

/** White field: small label on top, value below (like booking sites). */
export const fieldShell =
  'flex h-14 w-full items-center gap-3 rounded-lg bg-white px-3 text-left ring-1 ring-inset ring-zinc-300 focus-within:ring-2 focus-within:ring-brand-600';

export function Cell({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={fieldShell}>
      <span className="shrink-0 text-zinc-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-xs font-medium text-zinc-500">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

/**
 * Start location and drive time, the frame of "Orte vorschlagen lassen". A filled
 * start location switches the suggestions on; emptying it (or the clear button)
 * switches them off.
 */
export function OriginFields({ state, update, invalid }: { state: WizardState; update: Update; invalid: boolean }) {
  const loadLocalities = useCallback((q: string, signal: AbortSignal) => fetchLocalities(q, signal).then((r) => r.items), []);
  return (
    <div className="space-y-2" data-testid="origin-fields">
      <div className="grid gap-2">
        <Cell label={t.origin} htmlFor="origin" icon={<MapPinIcon aria-hidden="true" className="size-5" />}>
          <div className="flex items-center gap-2">
            <div
              data-origin={state.origin?.geonameid ?? ''}
              className="min-w-0 flex-1 [&_input]:bg-transparent [&_input]:p-0 [&_input]:font-semibold [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus:ring-0 [&_input]:sm:text-sm/6"
            >
              <AsyncCombobox<LocalityDto>
                id="origin"
                testId="origin-input"
                value={state.origin}
                onChange={(origin) => update({ origin, ...resetSuggestions(state) })}
                load={loadLocalities}
                itemKey={(l) => String(l.geonameid)}
                itemLabel={(l) => l.label}
                placeholder={t.originPlaceholder}
                emptyText={t.originNoResults}
                invalid={invalid}
                describedBy="origin-hint"
              />
            </div>
            {state.origin ? (
              <button
                type="button"
                className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={t.originClear}
                title={t.originClear}
                data-testid="origin-clear"
                onClick={() => update({ origin: null, ...resetSuggestions(state) })}
              >
                <XMarkIcon aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        </Cell>
        <TravelModeSwitch state={state} update={update} />
        {state.travelMode === 'flight' ? (
        <FlightFields state={state} update={update} />
        ) : (
        <Cell label={t.maxDriveShort} htmlFor="max-drive" icon={<ClockIcon aria-hidden="true" className="size-5" />}>
          <select
            id="max-drive"
            title={t.maxDrive}
            className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-sm/6 font-semibold text-zinc-950 focus:ring-0 focus:outline-none"
            value={state.maxDriveMinutes ?? ''}
            onChange={(e) => update({ maxDriveMinutes: e.target.value === '' ? null : Number(e.target.value), ...resetSuggestions(state) })}
          >
            <option value="">{t.noLimit}</option>
            {DRIVE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t.driveUpTo(m)}
              </option>
            ))}
          </select>
        </Cell>
        )}
      </div>
      <p id="origin-hint" className="text-sm text-zinc-500">
        {t.originHint}
      </p>
    </div>
  );
}

/** Optional start location of "Orte selbst wählen": only for the drive time next to each own place. */
export function OwnOriginField({ state, update }: { state: WizardState; update: Update }) {
  const loadLocalities = useCallback((q: string, signal: AbortSignal) => fetchLocalities(q, signal).then((r) => r.items), []);
  return (
    <div className="space-y-2" data-testid="own-origin-fields">
      <div className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-inset ring-zinc-300 focus-within:ring-2 focus-within:ring-brand-600">
        <label htmlFor="own-origin" className="block text-xs font-medium text-zinc-500">
          {t.originOptional}
        </label>
        <div className="flex items-center gap-2">
          <div
            data-origin={state.ownOrigin?.geonameid ?? ''}
            className="min-w-0 flex-1 [&_input]:bg-transparent [&_input]:p-0 [&_input]:font-semibold [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus:ring-0 [&_input]:text-sm/5"
          >
            <AsyncCombobox<LocalityDto>
              id="own-origin"
              testId="own-origin-input"
              value={state.ownOrigin}
              onChange={(ownOrigin) => update({ ownOrigin })}
              load={loadLocalities}
              itemKey={(l) => String(l.geonameid)}
              itemLabel={(l) => l.label}
              placeholder={t.originPlaceholder}
              emptyText={t.originNoResults}
              describedBy="own-origin-hint"
            />
          </div>
          {state.ownOrigin ? (
            <button
              type="button"
              className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label={t.originClear}
              title={t.originClear}
              data-testid="own-origin-clear"
              onClick={() => update({ ownOrigin: null })}
            >
              <XMarkIcon aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <p id="own-origin-hint" className="text-xs text-zinc-500">
        {t.originOptionalHint}
      </p>
    </div>
  );
}

/** Arrival, departure and travellers as one bar, valid for suggested and own places alike. */
export function DateTravellersBar({ state, update, meta }: { state: WizardState; update: Update; meta: MetaConfigResponse }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1 rounded-xl bg-accent-500 p-1 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]" data-testid="search-bar">
      <DateRangePicker
        start={state.windowStart}
        end={state.windowEnd}
        today={todayIso()}
        maxWindowDays={meta.limits.max_window_days}
        onChange={({ start, end }) => update({ windowStart: start, windowEnd: end })}
      />
      <TravellersPicker
        adults={state.adults}
        childrenAges={state.childrenAges}
        rooms={state.rooms}
        limits={{
          maxAdultsPerRoom: meta.limits.max_adults_per_room,
          maxChildrenPerRoom: meta.limits.max_children_per_room,
          maxRooms: meta.limits.max_rooms,
        }}
        onChange={(patch) => update(patch)}
      />
    </div>
  );
}
