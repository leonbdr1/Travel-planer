// `catalog import [--include-drafts]`: imports approved catalog entries
// (verified: true) idempotently by slug. Drafts only on request (local
// development). Coordinates come exclusively from the matched locality.
import type { Db } from '@reiseplaner/db';
import { slugify } from '@reiseplaner/domain';
import type { LoadedCatalog } from './load';

export interface CatalogImportStats {
  themes: number;
  regions: number;
  places: number;
  placeThemes: number;
  skippedUnverified: number;
  skippedUnmatched: number;
}

export async function importCatalog(db: Db, catalog: LoadedCatalog, options: { includeDrafts: boolean }): Promise<CatalogImportStats> {
  const stats: CatalogImportStats = { themes: 0, regions: 0, places: 0, placeThemes: 0, skippedUnverified: 0, skippedUnmatched: 0 };
  const selected = catalog.places.filter(({ place }) => {
    if (place.geonameid === undefined) {
      stats.skippedUnmatched += 1;
      return false;
    }
    if (!place.verified && !options.includeDrafts) {
      stats.skippedUnverified += 1;
      return false;
    }
    return true;
  });
  const ids = selected.map((p) => p.place.geonameid!);
  const coords = new Map(
    (
      await db.query<{ geonameid: number; lat: number; lng: number }>(
        'SELECT geonameid, lat, lng FROM app.geo_localities WHERE geonameid = ANY($1::int[])',
        [ids],
      )
    ).map((r) => [Number(r.geonameid), { lat: Number(r.lat), lng: Number(r.lng) }]),
  );

  await db.transaction(async (tx) => {
    for (const [i, theme] of catalog.themes.entries()) {
      await tx.query(
        `INSERT INTO app.themes (code, label_de, category, sort, active) VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (code) DO UPDATE SET label_de = EXCLUDED.label_de, category = EXCLUDED.category, sort = EXCLUDED.sort, active = true`,
        [theme.code, theme.label_de, theme.category, i],
      );
      stats.themes += 1;
    }
    const regionIds = new Map<string, string>();
    for (const region of catalog.regions) {
      const members = selected.filter((p) => p.region === region.slug).map((p) => coords.get(p.place.geonameid!)).filter((c) => c !== undefined);
      if (members.length === 0) continue;
      const lat = members.reduce((s, c) => s + c.lat, 0) / members.length;
      const lng = members.reduce((s, c) => s + c.lng, 0) / members.length;
      const verified = region.verified || selected.some((p) => p.region === region.slug && p.place.verified);
      const [row] = await tx.query<{ id: string }>(
        `INSERT INTO app.regions (slug, name, country_code, lat, lng, description_de, source, ai_assisted, verified, active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, now())
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, country_code = EXCLUDED.country_code, lat = EXCLUDED.lat,
           lng = EXCLUDED.lng, description_de = EXCLUDED.description_de, source = EXCLUDED.source,
           ai_assisted = EXCLUDED.ai_assisted, verified = EXCLUDED.verified, active = true, updated_at = now()
         RETURNING id::text AS id`,
        [region.slug, region.name, region.country, lat, lng, region.description_de, region.source, region.ai_assisted, verified],
      );
      if (row) regionIds.set(region.slug, row.id);
      stats.regions += 1;
    }
    const countryOf = new Map(catalog.regions.map((r) => [r.slug, r.country]));
    for (const { region, place } of selected) {
      const c = coords.get(place.geonameid!);
      const regionId = regionIds.get(region);
      if (!c || !regionId) {
        stats.skippedUnmatched += 1;
        continue;
      }
      const [row] = await tx.query<{ id: string }>(
        `INSERT INTO app.places (slug, name, region_id, geonameid, country_code, lat, lng, search_radius_km, description_de,
                                 ai_assisted, kind, verified, active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'catalog', $11, true, now())
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, geonameid = EXCLUDED.geonameid,
           country_code = EXCLUDED.country_code, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
           search_radius_km = EXCLUDED.search_radius_km, description_de = EXCLUDED.description_de,
           ai_assisted = EXCLUDED.ai_assisted, verified = EXCLUDED.verified, active = true, updated_at = now()
         RETURNING id::text AS id`,
        [
          slugify(place.name),
          place.name,
          regionId,
          place.geonameid!,
          countryOf.get(region) ?? 'DE',
          c.lat,
          c.lng,
          place.search_radius_km,
          place.description_de,
          place.ai_assisted,
          place.verified,
        ],
      );
      if (!row) continue;
      stats.places += 1;
      await tx.query('DELETE FROM app.place_themes WHERE place_id = $1', [row.id]);
      for (const [code, strength] of Object.entries(place.themes)) {
        await tx.query('INSERT INTO app.place_themes (place_id, theme_code, strength) VALUES ($1, $2, $3)', [row.id, code, strength]);
        stats.placeThemes += 1;
      }
    }
  });
  return stats;
}

export async function catalogCounts(db: Db): Promise<{ regions: number; places: number; verifiedPlaces: number }> {
  const [row] = await db.query<{ regions: number; places: number; verified: number }>(
    `SELECT (SELECT count(*)::int FROM app.regions) AS regions,
            (SELECT count(*)::int FROM app.places WHERE kind = 'catalog') AS places,
            (SELECT count(*)::int FROM app.places WHERE kind = 'catalog' AND verified) AS verified`,
  );
  return { regions: row?.regions ?? 0, places: row?.places ?? 0, verifiedPlaces: row?.verified ?? 0 };
}
