import type { Queryable } from '../db';

export interface CachedTravelTime {
  placeId: string;
  durationMin: number;
  distanceKm: number;
  provider: 'ors' | 'fake';
}

/** Only rows of `provider`: simulated drive times never stand in for real ones (and vice versa). */
export async function getCachedTravelTimes(
  db: Queryable,
  originCell: string,
  placeIds: readonly string[],
  notBefore: Date,
  provider: 'ors' | 'fake',
): Promise<Map<string, CachedTravelTime>> {
  if (placeIds.length === 0) return new Map();
  const rows = await db.query<{ place_id: string; duration_min: number; distance_km: number; provider: 'ors' | 'fake' }>(
    `SELECT place_id::text AS place_id, duration_min, distance_km::float8 AS distance_km, provider
       FROM app.travel_time_cache
      WHERE origin_cell = $1 AND place_id = ANY($2::uuid[]) AND fetched_at >= $3 AND provider = $4`,
    [originCell, placeIds, notBefore, provider],
  );
  return new Map(
    rows.map((r) => [r.place_id, { placeId: r.place_id, durationMin: r.duration_min, distanceKm: r.distance_km, provider: r.provider }]),
  );
}

export async function upsertTravelTimes(db: Queryable, originCell: string, rows: readonly CachedTravelTime[]): Promise<void> {
  for (const row of rows) {
    await db.query(
      `INSERT INTO app.travel_time_cache (origin_cell, place_id, duration_min, distance_km, provider, fetched_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (origin_cell, place_id) DO UPDATE
         SET duration_min = EXCLUDED.duration_min, distance_km = EXCLUDED.distance_km,
             provider = EXCLUDED.provider, fetched_at = EXCLUDED.fetched_at`,
      [originCell, row.placeId, row.durationMin, row.distanceKm, row.provider],
    );
  }
}
