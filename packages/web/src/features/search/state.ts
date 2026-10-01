// Wizard state (steps 1–3). Kept in sessionStorage so a reload keeps the
// progress; nothing leaves the browser except the API calls.
import { addDays, DEFAULT_GOAL, formatIsoDate, generateStayDates, type DatesResult, type Goal } from '@reiseplaner/domain';
import type { ContinentCode } from '@reiseplaner/domain';
import type { LocalityDto, MetaConfigResponse, PlaceDto, RegionSuggestionDto } from '@reiseplaner/contracts';

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  origin: LocalityDto | null;
  maxDriveMinutes: number | null;
  /** How the suggestions are found (F19): by car (drive time) or by plane (continents, optional flight time). */
  travelMode: 'car' | 'flight';
  continents: ContinentCode[];
  maxFlightMinutes: number | null;
  themes: string[];
  windowStart: string;
  windowEnd: string;
  nights: number;
  /** Longest stay of the night range (Aufgabe 4); equal to `nights` for a fixed number. */
  nightsMax: number;
  weekdays: number[];
  adults: number;
  childrenAges: number[];
  rooms: number;
  budgetEur: number | null;
  /** What the traveller is after (F15); stars and rating minimums live in the results. */
  goal: Goal;
  chips: string[];
  wishText: string;
  unmatched: string[];
  regions: RegionSuggestionDto[] | null;
  selectedRegionIds: string[];
  places: PlaceDto[];
  selectedPlaceIds: string[];
  /** true when the user skipped the region step (places entered directly). */
  direct: boolean;
  /**
   * Places the traveller picked by name (Aufgabe 3), kept next to the
   * suggestions: they survive a new suggestion round and stay selected.
   */
  ownPlaces: PlaceDto[];
  /** Start location the drive times of `ownPlaces` were computed for. */
  ownPlacesOrigin: number | null;
}

const KEY = 'wizard-state-v1';

export function todayIso(now: Date = new Date()): string {
  return formatIsoDate(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function initialState(now: Date = new Date()): WizardState {
  const today = todayIso(now);
  const start = addDays(today, 7);
  return {
    step: 1,
    origin: null,
    maxDriveMinutes: 180,
    travelMode: 'car',
    continents: ['europa'],
    maxFlightMinutes: null,
    themes: [],
    windowStart: start,
    windowEnd: addDays(start, 42),
    nights: 2,
    nightsMax: 2,
    weekdays: [5],
    adults: 2,
    childrenAges: [],
    rooms: 1,
    budgetEur: null,
    goal: DEFAULT_GOAL,
    chips: [],
    wishText: '',
    unmatched: [],
    regions: null,
    selectedRegionIds: [],
    places: [],
    selectedPlaceIds: [],
    direct: false,
    ownPlaces: [],
    ownPlacesOrigin: null,
  };
}

export function loadState(): WizardState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...initialState(), ...(JSON.parse(raw) as Partial<WizardState>) };
  } catch {
    // storage unavailable (private mode): start fresh
  }
  return initialState();
}

export function saveState(state: WizardState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function stayDates(state: WizardState, meta: MetaConfigResponse, now: Date = new Date()): DatesResult {
  return generateStayDates(
    {
      window: { start: state.windowStart, end: state.windowEnd },
      nights: state.nights,
      nightsMax: Math.max(state.nights, state.nightsMax),
      arrivalWeekdays: state.weekdays,
      today: todayIso(now),
    },
    { maxDates: meta.limits.max_dates, maxNights: meta.limits.max_nights, maxWindowDays: meta.limits.max_window_days },
  );
}

/**
 * The start location, when there is one: it switches the suggestions on and gives
 * the drive times next to own places.
 */
export function activeOrigin(state: Pick<WizardState, 'origin'>): LocalityDto | null {
  return state.origin;
}

/**
 * The input decides the way to a place: a start location means "suggest places",
 * picked places mean "own places". No tick boxes.
 */
export function wantsSuggestions(state: Pick<WizardState, 'origin'>): boolean {
  return state.origin !== null;
}

/** Suggested and own places in one list (own places after the suggestions, without duplicates). */
export function allPlaces(state: Pick<WizardState, 'places' | 'ownPlaces'>): PlaceDto[] {
  const ids = new Set(state.places.map((p) => p.id));
  return [...state.places, ...state.ownPlaces.filter((p) => !ids.has(p.id))];
}

/** The selected ids that belong to own places. */
export function keepOwnSelection(state: Pick<WizardState, 'ownPlaces' | 'selectedPlaceIds'>): string[] {
  return state.selectedPlaceIds.filter((id) => state.ownPlaces.some((p) => p.id === id));
}

/** Patch that drops the suggestions (new start, drive time or themes) and keeps the own places with their selection. */
export function resetSuggestions(state: Pick<WizardState, 'ownPlaces' | 'selectedPlaceIds'>): Partial<WizardState> {
  return {
    regions: null,
    selectedRegionIds: [],
    places: [],
    selectedPlaceIds: keepOwnSelection(state),
  };
}

export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** What the suggestion requests carry for the way of travel (F19); in flight mode the drive time does not apply. */
export function travelParams(state: Pick<WizardState, 'travelMode' | 'maxDriveMinutes' | 'continents' | 'maxFlightMinutes'>) {
  return {
    travel_mode: state.travelMode,
    max_drive_minutes: state.travelMode === 'flight' ? null : state.maxDriveMinutes,
    continents: state.travelMode === 'flight' ? state.continents : [],
    max_flight_minutes: state.travelMode === 'flight' ? state.maxFlightMinutes : null,
  };
}
