// Search bar in the style of booking sites: start location, drive time,
// arrival and departure (calendar popover), travellers. Used on the home page
// and as the top of step 1.
import { useCallback, type ReactNode } from 'react';
import { ClockIcon, MapPinIcon } from '@heroicons/react/20/solid';
import type { LocalityDto, MetaConfigResponse } from '@reiseplaner/contracts';
import { ErrorMessage, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { AsyncCombobox } from './AsyncCombobox';
import { fetchLocalities } from './api';
import { DateRangePicker } from './DateRangePicker';
import { resetSuggestions, todayIso, type WizardState } from './state';
import { TravellersPicker } from './TravellersPicker';

const t = de.wizard.frame;
export const DRIVE_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360];

type Update = (patch: Partial<WizardState>) => void;

/** White field of the bar: small label on top, value below (like booking sites). */
export const fieldShell =
  'flex h-14 w-full items-center gap-3 rounded-lg bg-white px-3 text-left ring-1 ring-inset ring-zinc-300 focus-within:ring-2 focus-within:ring-brand-600';

function Cell({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: ReactNode; children: ReactNode }) {
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

export function SearchBar({
  state,
  update,
  meta,
  touched,
  action,
}: {
  state: WizardState;
  update: Update;
  meta: MetaConfigResponse;
  touched: boolean;
  /** Optional submit button at the end of the bar (home page). */
  action?: ReactNode;
}) {
  const loadLocalities = useCallback(
    (q: string, signal: AbortSignal) => fetchLocalities(q, signal).then((r) => r.items),
    [],
  );
  const originMissing = state.origin === null;
  return (
    <div className="space-y-2">
      <div
        className={cx(
          'grid gap-1 rounded-xl bg-accent-500 p-1 shadow-sm',
          action
            ? 'md:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.3fr)_auto]'
            : 'md:grid-cols-2',
        )}
        data-testid="search-bar"
      >
        <Cell label={t.origin} htmlFor="origin" icon={<MapPinIcon aria-hidden="true" className="size-5" />}>
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
        <Cell label={t.maxDriveShort} htmlFor="max-drive" icon={<ClockIcon aria-hidden="true" className="size-5" />}>
          <select
            id="max-drive"
            title={t.maxDrive}
            className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-sm/6 font-semibold text-zinc-950 focus:ring-0 focus:outline-none"
            value={state.maxDriveMinutes ?? ''}
            onChange={(e) =>
              update({ maxDriveMinutes: e.target.value === '' ? null : Number(e.target.value), ...resetSuggestions(state) })
            }
          >
            <option value="">{t.noLimit}</option>
            {DRIVE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {t.driveUpTo(m)}
              </option>
            ))}
          </select>
        </Cell>
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
        {action}
      </div>
      <p id="origin-hint" className="text-sm text-zinc-500">
        {t.originHint}
      </p>
      {touched && originMissing ? <ErrorMessage>{t.originRequired}</ErrorMessage> : null}
    </div>
  );
}
