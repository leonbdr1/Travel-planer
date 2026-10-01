// Wizard state → SearchRequest (architektur.md 7.3).
import type { SearchRequest } from '@reiseplaner/contracts';
import { activeOrigin, type WizardState } from './state';

export function toSearchRequest(state: WizardState): SearchRequest | null {
  const origin = activeOrigin(state);
  return {
    goal: state.goal,
    origin: origin ? { geonameid: origin.geonameid, label: origin.name, lat: origin.lat, lng: origin.lng } : null,
    max_drive_minutes: state.travelMode === 'flight' ? null : state.maxDriveMinutes,
    themes: state.themes,
    window: { start: state.windowStart, end: state.windowEnd },
    nights: state.nights,
    nights_max: state.nightsMax > state.nights ? state.nightsMax : null,
    arrival_weekdays: state.weekdays,
    occupancy: { rooms: state.rooms, adults: state.adults, children_ages: state.childrenAges },
    budget_total_eur: state.budgetEur,
    // Stars and rating minimums are set in the results ("Weitere Filter").
    filters: {
      min_stars: null,
      min_rating: null,
      min_reviews: null,
      property_types: [],
      refundable_only: false,
      board: null,
    },
    chips: state.chips,
    place_ids: state.selectedPlaceIds,
  };
}
