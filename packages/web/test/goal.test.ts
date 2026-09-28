// Goal in the search form (F15): every goal has a name and a hint, the
// request carries the chosen goal, and stars or rating minimums no longer
// come from the form (they are "Weitere Filter" in the results).
import { describe, expect, it } from 'vitest';
import { goalSchema, type LocalityDto } from '@reiseplaner/contracts';
import { DEFAULT_GOAL, GOALS } from '@reiseplaner/domain';
import { toSearchRequest } from '../src/features/search/request';
import { initialState } from '../src/features/search/state';
import { de } from '../src/i18n/de';

const stuttgart: LocalityDto = {
  geonameid: 2825297,
  name: 'Stuttgart',
  label: 'Stuttgart, Baden-Württemberg, DE',
  admin_name: 'Baden-Württemberg',
  country_code: 'DE',
  lat: 48.78232,
  lng: 9.17702,
  population: 589793,
};

describe('goal in the search form', () => {
  it('names every goal of domain and contract', () => {
    expect([...goalSchema.options]).toEqual([...GOALS]);
    for (const goal of GOALS) {
      expect(de.goals.names[goal]).not.toBe('');
      expect(de.goals.hints[goal]).not.toBe('');
    }
  });

  it('starts with the default goal and sends the chosen one without star or rating minimum', () => {
    const initial = initialState(new Date('2026-09-28T10:00:00Z'));
    expect(initial.goal).toBe(DEFAULT_GOAL);
    const request = toSearchRequest({ ...initial, origin: stuttgart, goal: 'sparen', selectedPlaceIds: ['00000000-0000-4000-8000-000000000001'] });
    expect(request?.goal).toBe('sparen');
    expect(request?.filters.min_stars).toBeNull();
    expect(request?.filters.min_rating).toBeNull();
  });
});
