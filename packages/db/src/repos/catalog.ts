// Catalog reads for suggestions and place search (architektur.md 5.2, 6.2)
// and user places created from the locality database (kind = user).
import {
  ATTRACTIVENESS_NEIGHBOUR_KM,
  catalogAttractiveness,
  catalogCountry,
  haversineKm,
  slugify,
  userPlaceAttractiveness,
  type Attractiveness,
} from '@reiseplaner/domain';
import type { Queryable } from '../db';
import type { Locality } from './geo';

export interface CatalogPlace {
  id: string;
  slug: string;
  name: string;
  kind: 'catalog' | 'user';
  regionId: string | null;
  regionSlug: string | null;
  regionName: string | null;
  countryCode: string;
  geonameid: number;
  lat: number;
  lng: number;
  searchRadiusKm: number;
  descriptionDe: string | null;
  aiAssisted: boolean;
  verified: boolean;
  themes: Record<string, number>;
  /** What a traveller can do there (Aufgabe 8): catalog places from their ratings, user places from size and a catalog place nearby. */
  attractiveness: Attractiveness;
}

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  kind: 'catalog' | 'user';
  region_id: string | null;
  region_slug: string | null;
  region_name: string | null;
  country_code: string;
  geonameid: number;
  lat: number;
  lng: number;
  search_radius_km: number;
  description_de: string | null;
  ai_assisted: boolean;
  verified: boolean;
  themes: string;
  fame: number | null;
  attractions: number | null;
  population: number | null;
  nb_fame: number | null;
  nb_attractions: number | null;
  nb_population: number | null;
  nb_themes: string | null;
  nb_lat: number | null;
  nb_lng: number | null;
};

const SELECT_PLACES = `
  SELECT p.id::text AS id, p.slug, p.name, p.kind, p.region_id::text AS region_id, r.slug AS region_slug, r.name AS region_name,
         p.country_code, p.geonameid, p.lat, p.lng, p.search_radius_km::float8 AS search_radius_km,
         p.description_de, p.ai_assisted, p.verified,
         coalesce((SELECT jsonb_object_agg(pt.theme_code, pt.strength) FROM app.place_themes pt WHERE pt.place_id = p.id), '{}'::jsonb)::text AS themes,
         p.fame, p.attractions, (SELECT g.population FROM app.geo_localities g WHERE g.geonameid = p.geonameid) AS population,
         nb.nb_fame, nb.nb_attractions, nb.nb_population, nb.nb_themes, nb.nb_lat, nb.nb_lng
    FROM app.places p
    LEFT JOIN app.regions r ON r.id = p.region_id
    LEFT JOIN LATERAL (
      -- User places borrow from the nearest catalog place (Aufgabe 8); the box is a little larger than ATTRACTIVENESS_NEIGHBOUR_KM.
      SELECT c.fame AS nb_fame, c.attractions AS nb_attractions, c.lat::float8 AS nb_lat, c.lng::float8 AS nb_lng,
             (SELECT g.population FROM app.geo_localities g WHERE g.geonameid = c.geonameid) AS nb_population,
             coalesce((SELECT jsonb_object_agg(pt.theme_code, pt.strength) FROM app.place_themes pt WHERE pt.place_id = c.id), '{}'::jsonb)::text AS nb_themes
        FROM app.places c
       WHERE p.kind = 'user' AND c.kind = 'catalog' AND c.active
         AND abs(c.lat - p.lat) < 0.08 AND abs(c.lng - p.lng) < 0.12
       ORDER BY (c.lat - p.lat) ^ 2 + ((c.lng - p.lng) * 0.68) ^ 2
       LIMIT 1
    ) nb ON true`;

/** Catalog entries visible to users: approved, or drafts when allowed (dev only, BG-11). */
const VISIBLE = `p.active AND (p.kind = 'user' OR (p.kind = 'catalog' AND ($1::boolean OR (p.verified AND r.verified)) AND r.active))`;

function toPlace(r: PlaceRow): CatalogPlace {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    regionId: r.region_id,
    regionSlug: r.region_slug,
    regionName: r.region_name,
    countryCode: r.country_code,
    geonameid: Number(r.geonameid),
    lat: Number(r.lat),
    lng: Number(r.lng),
    searchRadiusKm: Number(r.search_radius_km),
    descriptionDe: r.description_de,
    aiAssisted: r.ai_assisted,
    verified: r.verified,
    themes: JSON.parse(r.themes) as Record<string, number>,
    attractiveness: attractivenessOfRow(r),
  };
}

const num = (v: number | null) => (v === null ? null : Number(v));

function attractivenessOfRow(r: PlaceRow): Attractiveness {
  const themes = JSON.parse(r.themes) as Record<string, number>;
  if (r.kind === 'catalog') return catalogAttractiveness({ fame: num(r.fame), attractions: num(r.attractions), themes, population: num(r.population) });
  const near =
    r.nb_lat !== null && r.nb_lng !== null && haversineKm({ lat: Number(r.lat), lng: Number(r.lng) }, { lat: Number(r.nb_lat), lng: Number(r.nb_lng) }) <= ATTRACTIVENESS_NEIGHBOUR_KM;
  const neighbour = near
    ? catalogAttractiveness({
        fame: num(r.nb_fame),
        attractions: num(r.nb_attractions),
        themes: JSON.parse(r.nb_themes ?? '{}') as Record<string, number>,
        population: num(r.nb_population),
      }).parts
    : null;
  return userPlaceAttractiveness({ population: num(r.population), neighbour });
}

/** Places by id, whatever their visibility (the places of a search, Aufgabe 8). */
export async function placesByIds(db: Queryable, ids: readonly string[]): Promise<CatalogPlace[]> {
  if (ids.length === 0) return [];
  const rows = await db.query<PlaceRow>(`${SELECT_PLACES} WHERE p.id = ANY($1::uuid[])`, [ids]);
  return rows.map(toPlace);
}

export interface CatalogVisibility {
  includeDrafts: boolean;
}

export async function listCatalogPlaces(db: Queryable, v: CatalogVisibility): Promise<CatalogPlace[]> {
  const rows = await db.query<PlaceRow>(`${SELECT_PLACES} WHERE p.kind = 'catalog' AND ${VISIBLE} ORDER BY r.name, p.name`, [
    v.includeDrafts,
  ]);
  return rows.map(toPlace);
}

export async function getPlacesByIds(db: Queryable, ids: readonly string[], v: CatalogVisibility): Promise<CatalogPlace[]> {
  if (ids.length === 0) return [];
  const rows = await db.query<PlaceRow>(`${SELECT_PLACES} WHERE p.id = ANY($2::uuid[]) AND ${VISIBLE}`, [v.includeDrafts, [...ids]]);
  return rows.map(toPlace);
}

export async function searchCatalogPlaces(db: Queryable, query: string, limit: number, v: CatalogVisibility): Promise<CatalogPlace[]> {
  const rows = await db.query<PlaceRow>(
    `${SELECT_PLACES}
      WHERE p.kind = 'catalog' AND ${VISIBLE} AND (lower(p.name) LIKE lower($2) || '%' OR lower(p.name) LIKE '% ' || lower($2) || '%')
      ORDER BY (lower(p.name) = lower($2)) DESC, p.name LIMIT $3`,
    [v.includeDrafts, query, limit],
  );
  return rows.map(toPlace);
}

export interface RegionRow {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  descriptionDe: string;
  aiAssisted: boolean;
  verified: boolean;
}

export async function getRegions(db: Queryable, ids: readonly string[], v: CatalogVisibility): Promise<RegionRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.query<{
    id: string;
    slug: string;
    name: string;
    country_code: string;
    description_de: string;
    ai_assisted: boolean;
    verified: boolean;
  }>(
    `SELECT id::text AS id, slug, name, country_code, description_de, ai_assisted, verified
       FROM app.regions r WHERE r.id = ANY($2::uuid[]) AND r.active AND ($1::boolean OR r.verified)`,
    [v.includeDrafts, [...ids]],
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    countryCode: r.country_code,
    descriptionDe: r.description_de,
    aiAssisted: r.ai_assisted,
    verified: r.verified,
  }));
}

/**
 * A locality chosen by the user: the catalog place for that locality if one
 * is visible, otherwise a user place (kind = user, verified = false), created
 * once per geonameid.
 */
export async function ensureUserPlace(db: Queryable, locality: Locality, v: CatalogVisibility): Promise<CatalogPlace> {
  const existing = await db.query<PlaceRow>(
    `${SELECT_PLACES} WHERE p.geonameid = $2 AND ${VISIBLE} ORDER BY (p.kind = 'catalog') DESC LIMIT 1`,
    [v.includeDrafts, locality.geonameid],
  );
  if (existing[0]) return toPlace(existing[0]);
  const country = catalogCountry(locality.countryCode, locality.admin2) ?? locality.countryCode;
  await db.query(
    `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
     VALUES ($1, $2, $3, $4, $5, $6, 'user', false)
     ON CONFLICT (geonameid) WHERE kind = 'user' DO NOTHING`,
    [`ort-${locality.geonameid}-${slugify(locality.displayName)}`.slice(0, 80), locality.displayName, locality.geonameid, country, locality.lat, locality.lng],
  );
  const rows = await db.query<PlaceRow>(`${SELECT_PLACES} WHERE p.geonameid = $1 AND p.kind = 'user'`, [locality.geonameid]);
  if (!rows[0]) throw new Error('user place insert failed');
  return toPlace(rows[0]);
}
