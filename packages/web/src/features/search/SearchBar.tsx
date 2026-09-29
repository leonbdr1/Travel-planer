// Building blocks of the search frame: the start location and drive time
// fields (part of "Orte vorschlagen lassen") and the bar with arrival,
// departure (calendar popover) and travellers that sits below "Wohin soll es
// gehen?" and counts for both ways to a place.
import { useCallback } from 'react';
import { ClockIcon, MapPinIcon } from '@heroicons/react/20/solid';
import type { LocalityDto, MetaConfigResponse } from '@reiseplaner/contracts';
import { ErrorMessage } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { AsyncCombobox } from './AsyncCombobox';
import { fetchLocalities } from './api';
import { DateRangePicker } from './DateRangePicker';
import { resetSuggestions, todayIso, type WizardState } from './state';
import { TravellersPicker } from './TravellersPicker';

const t = de.wizard.frame;
export const DRIVE_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360];

type Update = (patch: Partial<WizardState>) => void;

/** White field: small label on top, value below (like booking sites). */
export const fieldShell =
  'flex h-14 w-full items-center gap-3 rounded-lg bg-white px-3 text-left ring-1 ring-inset ring-zinc-300 focus-within:ring-2 focus-within:ring-brand-600';

function Cell({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: React.ReactNode; children: React.ReactNode }) {
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

/** Start location and drive time, the frame of "Orte vorschlagen lassen". */
export function OriginFields({ state, update, touched, optional = false }: { state: WizardState; update: Update; touched: boolean; optional?: boolean }) {
  const loadLocalities = useCallback((q: string, signal: AbortSignal) => fetchLocalities(q, signal).then((r) => r.items), []);
  const originMissing = state.origin === null && !optional;
  return (
    <div className="space-y-2" data-testid={optional ? 'origin-optional' : 'origin-fields'}>
      <div className="grid gap-2">
        <Cell label={optional ? t.originOptional : t.origin} htmlFor="origin" icon={<MapPinIcon aria-hidden="true" className="size-5" />}>
          <div
            data-origin={state.origin?.geonameid ?? ''}
            className="[&_input]:bg-transparent [&_input]:p-0 [&_input]:font-semibold [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus:ring-0 [&_input]:sm:text-sm/6"
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
              invalid={touched && originMissing}
              describedBy="origin-hint"
            />
          </div>
        </Cell>
        {optional ? null : (
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
        {optional ? t.originOptionalHint : t.originHint}
      </p>
      {touched && originMissing ? <ErrorMessage>{t.originRequired}</ErrorMessage> : null}
    </div>
  );
}

/** Arrival, departure and travellers as one bar, valid for suggested and own places alike. */
export function DateTravellersBar({ state, update, meta }: { state: WizardState; update: Update; meta: MetaConfigResponse }) {
  return (
    <div className="grid gap-1 rounded-xl bg-accent-500 p-1 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]" data-testid="search-bar">
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
