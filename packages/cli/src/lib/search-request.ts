// A SearchRequest for demos and walkthrough helpers (Stuttgart, Fridays, 2 nights).
import type { Queryable } from '@reiseplaner/db';

export async function catalogPlaceIds(db: Queryable, names: string[]): Promise<string[]> {
  const rows = await db.query<{ id: string; name: string }>(
    "SELECT id::text AS id, name FROM app.places WHERE kind = 'catalog' AND name = ANY($1::text[])",
    [names],
  );
  return names.map((n) => {
    const row = rows.find((r) => r.name === n);
    if (!row) throw new Error(`catalog place ${n} not found`);
    return row.id;
  });
}

export function demoSearchRequest(placeIds: string[], window: { start: string; end: string }, altcha: string) {
  return {
    origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78232, lng: 9.17702 },
    max_drive_minutes: 240,
    themes: ['wandern'],
    window,
    nights: 2,
    arrival_weekdays: [5],
    occupancy: { rooms: 1, adults: 2, children_ages: [] },
    budget_total_eur: null,
    filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
    chips: [],
    place_ids: placeIds,
    altcha,
  };
}
