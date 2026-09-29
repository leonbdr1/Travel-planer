// Localities (GeoNames) for start-location autocomplete and catalog matching.
import { adminAreaName, displayName, normalizeQuery } from '@reiseplaner/domain';
import type { Queryable } from '../db';

export interface Locality {
  geonameid: number;
  name: string;
  displayName: string;
  altNamesDe: string[];
  countryCode: string;
  admin1: string;
  admin2: string;
  adminName: string | null;
  lat: number;
  lng: number;
  population: number;
  postalCodes: string[];
}

type LocalityRow = {
  geonameid: number;
  name: string;
  alt_names_de: string[];
  country_code: string;
  admin1: string;
  admin2: string;
  lat: number;
  lng: number;
  population: number;
  postal_codes: string[];
};

function toLocality(r: LocalityRow): Locality {
  return {
    geonameid: Number(r.geonameid),
    name: r.name,
    displayName: displayName(r.name, r.alt_names_de, r.country_code),
    altNamesDe: r.alt_names_de,
    countryCode: r.country_code,
    admin1: r.admin1,
    admin2: r.admin2,
    adminName: adminAreaName(r.country_code, r.admin1, r.admin2),
    lat: Number(r.lat),
    lng: Number(r.lng),
    population: Number(r.population),
    postalCodes: r.postal_codes,
  };
}

export async function searchLocalities(db: Queryable, query: string, limit: number): Promise<Locality[]> {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const rows = await db.query<LocalityRow>('SELECT * FROM app.search_localities($1, $2)', [q, limit]);
  return rows.map(toLocality);
}

export async function getLocality(db: Queryable, geonameid: number): Promise<Locality | null> {
  const rows = await db.query<LocalityRow>(
    `SELECT geonameid, name, alt_names_de, country_code::text AS country_code, admin1, admin2, lat, lng, population, postal_codes
       FROM app.geo_localities WHERE geonameid = $1`,
    [geonameid],
  );
  return rows[0] ? toLocality(rows[0]) : null;
}

/**
 * Deterministic catalog matching (architektur.md S3.4): exact name or German
 * alternative name within the country (and admin1 if given), largest first;
 * otherwise the best trigram match above the threshold.
 */
export async function matchLocality(
  db: Queryable,
  name: string,
  countryCode: string,
  admin1: string | null,
): Promise<{ locality: Locality; exact: boolean } | null> {
  const country = countryCode === 'IT-BZ' ? 'IT' : countryCode;
  const q = normalizeQuery(name);
  const exact = await db.query<LocalityRow>(
    `SELECT geonameid, name, alt_names_de, country_code::text AS country_code, admin1, admin2, lat, lng, population, postal_codes
       FROM app.geo_localities
      WHERE country_code = $1 AND ($2::text IS NULL OR admin1 = $2)
        AND (lower(name) = lower($3) OR lower($3) = ANY(SELECT lower(a) FROM unnest(alt_names_de) a) OR lower(ascii_name) = $4)
      ORDER BY population DESC LIMIT 1`,
    [country, admin1, name, q],
  );
  if (exact[0]) return { locality: toLocality(exact[0]), exact: true };
  const fuzzy = (await searchLocalities(db, name, 5)).filter(
    (l) => l.countryCode === country && (admin1 === null || l.admin1 === admin1),
  );
  return fuzzy[0] ? { locality: fuzzy[0], exact: false } : null;
}

/** Localities with at least one postal code (the development seed re-imports when the extract gained them). */
export async function countLocalitiesWithPostalCodes(db: Queryable): Promise<number> {
  const rows = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM app.geo_localities WHERE cardinality(postal_codes) > 0`);
  return rows[0]?.n ?? 0;
}

export async function countLocalities(db: Queryable): Promise<Record<string, number>> {
  const rows = await db.query<{ key: string; n: number }>(
    `SELECT CASE WHEN country_code = 'IT' THEN 'IT-BZ' ELSE country_code::text END AS key, count(*)::int AS n
       FROM app.geo_localities GROUP BY 1 ORDER BY 1`,
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.n]));
}
