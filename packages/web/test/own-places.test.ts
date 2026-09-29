// Own places next to the suggestions (Aufgabe 3): a new suggestion round
// drops the suggested places but keeps the places picked by name.
import { describe, expect, it } from 'vitest';
import type { PlaceDto } from '@reiseplaner/contracts';
import { allPlaces, initialState, keepOwnSelection, resetSuggestions } from '../src/features/search/state';

const place = (id: string, kind: 'catalog' | 'user' = 'user'): PlaceDto => ({
  id,
  name: id,
  kind,
  geonameid: null,
  region_id: null,
  region_name: null,
  country_code: 'DE',
  description: null,
  ai_assisted: false,
  verified: false,
  themes: [],
  matched_themes: [],
  minutes: null,
  estimated: false,
});

describe('own places', () => {
  const state = {
    ...initialState(new Date('2026-09-29T10:00:00Z')),
    places: [place('oberstdorf', 'catalog'), place('fuessen', 'catalog')],
    ownPlaces: [place('koeln'), place('berlin'), place('fuessen', 'catalog')],
    selectedPlaceIds: ['oberstdorf', 'koeln', 'berlin'],
  };

  it('keeps the selection of own places when the suggestions are reset', () => {
    expect(keepOwnSelection(state)).toEqual(['koeln', 'berlin']);
    expect(resetSuggestions(state)).toEqual({ regions: null, selectedRegionIds: [], places: [], selectedPlaceIds: ['koeln', 'berlin'] });
  });

  it('lists suggestions and own places once each', () => {
    expect(allPlaces(state).map((p) => p.id)).toEqual(['oberstdorf', 'fuessen', 'koeln', 'berlin']);
  });
});
