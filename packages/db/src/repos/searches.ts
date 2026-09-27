// Searches, combinations, hotels, offers and the provider cache
// (architektur.md 5.3, 5.4). Writes from workflow steps are idempotent.
import type { NormalizedOffer } from '@reiseplaner/domain';
import { json, type Db, type Queryable } from '../db';

export type SearchStatus = 'queued' | 'running' | 'reviewing' | 'done' | 'partial' | 'failed';
export type CombinationStatus = 'pending' | 'done' | 'cached' | 'failed';

export interface NewSearch {
  tokenHash: string;
  request: unknown;
  originLat: number;
  originLng: number;
  ipHash: string | null;
  places: Array<{ placeId: string; driveMinutes: number | null; source: 'suggested' | 'user' }>;
  dates: Array<{ checkin: string; checkout: string }>;
}

/** Creates the search with its places and all place × date combinations in one transaction. */
export async function createSearch(db: Db, s: NewSearch): Promise<{ id: string; combos: number }> {
  return db.transaction(async (tx) => {
    const combos = s.places.length * s.dates.length;
    const rows = await tx.query<{ id: string }>(
      `INSERT INTO app.searches (token_hash, request, origin_lat, origin_lng, combos_total, ip_hash)
       VALUES ($1, $2::text::jsonb, $3, $4, $5, $6) RETURNING id::text AS id`,
      [s.tokenHash, json(s.request), s.originLat, s.originLng, combos, s.ipHash],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error('search insert failed');
    await tx.query(
      `INSERT INTO app.search_places (search_id, place_id, drive_minutes, source, sort)
       SELECT $1::uuid, p.place_id::uuid, p.drive_minutes::int, p.source, p.sort::int
         FROM jsonb_to_recordset($2::text::jsonb) AS p(place_id text, drive_minutes int, source text, sort int)`,
      [id, json(s.places.map((p, sort) => ({ place_id: p.placeId, drive_minutes: p.driveMinutes, source: p.source, sort })))],
    );
    await tx.query(
      `INSERT INTO app.search_combinations (search_id, place_id, checkin, checkout)
       SELECT $1::uuid, sp.place_id, d.checkin::date, d.checkout::date
         FROM app.search_places sp
         CROSS JOIN jsonb_to_recordset($2::text::jsonb) AS d(checkin text, checkout text)
        WHERE sp.search_id = $1::uuid
        ORDER BY sp.sort, d.checkin`,
      [id, json(s.dates)],
    );
    return { id, combos };
  });
}

export interface SearchRow {
  id: string;
  tokenHash: string;
  status: SearchStatus;
  request: unknown;
  originLat: number;
  originLng: number;
  combosTotal: number;
  combosDone: number;
  combosFailed: number;
  workflowInstanceId: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

type SearchDbRow = {
  id: string;
  token_hash: string;
  status: SearchStatus;
  request: string;
  origin_lat: number;
  origin_lng: number;
  combos_total: number;
  combos_done: number;
  combos_failed: number;
  workflow_instance_id: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export async function getSearch(db: Queryable, id: string): Promise<SearchRow | null> {
  const rows = await db.query<SearchDbRow>(
    `SELECT id::text AS id, token_hash, status, request::text AS request, origin_lat, origin_lng, combos_total, combos_done,
            combos_failed, workflow_instance_id, error, created_at::text AS created_at, started_at::text AS started_at,
            finished_at::text AS finished_at
       FROM app.searches WHERE id = $1::uuid`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    tokenHash: r.token_hash,
    status: r.status,
    request: JSON.parse(r.request) as unknown,
    originLat: Number(r.origin_lat),
    originLng: Number(r.origin_lng),
    combosTotal: Number(r.combos_total),
    combosDone: Number(r.combos_done),
    combosFailed: Number(r.combos_failed),
    workflowInstanceId: r.workflow_instance_id,
    error: r.error,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

export async function setWorkflowInstance(db: Queryable, searchId: string, instanceId: string): Promise<void> {
  await db.query('UPDATE app.searches SET workflow_instance_id = $2 WHERE id = $1::uuid', [searchId, instanceId]);
}

/** queued → running (idempotent); returns the start time (UTC ISO). */
export async function markSearchRunning(db: Queryable, searchId: string): Promise<string> {
  const rows = await db.query<{ started_at: string }>(
    `UPDATE app.searches
        SET status = CASE WHEN status = 'queued' THEN 'running' ELSE status END,
            started_at = coalesce(started_at, now())
      WHERE id = $1::uuid
      RETURNING to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS started_at`,
    [searchId],
  );
  const started = rows[0]?.started_at;
  if (!started) throw new Error(`search ${searchId} not found`);
  return started;
}

export async function setSearchStatus(db: Queryable, searchId: string, status: SearchStatus, error: string | null = null): Promise<void> {
  const final = status === 'done' || status === 'partial' || status === 'failed';
  await db.query(
    `UPDATE app.searches SET status = $2, error = $3, finished_at = CASE WHEN $4::boolean THEN coalesce(finished_at, now()) ELSE finished_at END
      WHERE id = $1::uuid`,
    [searchId, status, error === null ? null : error.slice(0, 200), final],
  );
}

/** Recomputes progress counters from the combination states (idempotent). */
export async function recountSearch(db: Queryable, searchId: string): Promise<{ done: number; failed: number; total: number }> {
  const rows = await db.query<{ done: number; failed: number; total: number }>(
    `UPDATE app.searches s
        SET combos_done = c.done, combos_failed = c.failed
       FROM (SELECT count(*) FILTER (WHERE status IN ('done', 'cached'))::int AS done,
                    count(*) FILTER (WHERE status = 'failed')::int AS failed
               FROM app.search_combinations WHERE search_id = $1::uuid) c
      WHERE s.id = $1::uuid
      RETURNING c.done, c.failed, s.combos_total AS total`,
    [searchId],
  );
  const r = rows[0];
  return { done: Number(r?.done ?? 0), failed: Number(r?.failed ?? 0), total: Number(r?.total ?? 0) };
}

export interface CombinationTask {
  id: number;
  placeId: string;
  checkin: string;
  checkout: string;
  status: CombinationStatus;
  lat: number;
  lng: number;
  searchRadiusKm: number;
}

/** The combinations of block `index` (fixed order by id). */
export async function combinationBlock(db: Queryable, searchId: string, index: number, size: number): Promise<CombinationTask[]> {
  const rows = await db.query<{
    id: number;
    place_id: string;
    checkin: string;
    checkout: string;
    status: CombinationStatus;
    lat: number;
    lng: number;
    search_radius_km: number;
  }>(
    `SELECT c.id, c.place_id::text AS place_id, c.checkin::text AS checkin, c.checkout::text AS checkout, c.status,
            p.lat, p.lng, p.search_radius_km::float8 AS search_radius_km
       FROM app.search_combinations c JOIN app.places p ON p.id = c.place_id
      WHERE c.search_id = $1::uuid
      ORDER BY c.id OFFSET $2 LIMIT $3`,
    [searchId, index * size, size],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    placeId: r.place_id,
    checkin: r.checkin,
    checkout: r.checkout,
    status: r.status,
    lat: Number(r.lat),
    lng: Number(r.lng),
    searchRadiusKm: Number(r.search_radius_km),
  }));
}

export async function markCombination(
  db: Queryable,
  combinationId: number,
  status: CombinationStatus,
  offersCount: number,
  error: string | null = null,
): Promise<void> {
  await db.query(
    'UPDATE app.search_combinations SET status = $2, offers_count = $3, error = $4, updated_at = now() WHERE id = $1',
    [combinationId, status, offersCount, error === null ? null : error.slice(0, 200)],
  );
}

/** Deadline or finalize: every still pending combination becomes failed. */
export async function failPendingCombinations(db: Queryable, searchId: string, error: string): Promise<number> {
  const rows = await db.query<{ n: number }>(
    `WITH u AS (UPDATE app.search_combinations SET status = 'failed', error = $2, updated_at = now()
                 WHERE search_id = $1::uuid AND status = 'pending' RETURNING 1)
     SELECT count(*)::int AS n FROM u`,
    [searchId, error],
  );
  return Number(rows[0]?.n ?? 0);
}

export interface HotelUpsert {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  stars: number | null;
  rating: number | null;
  reviewCount: number | null;
  hotelType: string | null;
  mainPhotoUrl: string | null;
  facilityIds: number[];
}

export async function upsertHotels(db: Queryable, hotels: readonly HotelUpsert[]): Promise<void> {
  if (hotels.length === 0) return;
  await db.query(
    `INSERT INTO app.hotels (id, name, address, city, country_code, lat, lng, stars, rating, review_count, hotel_type, main_photo_url,
                             facility_ids, content_fetched_at)
     SELECT h.id, h.name, h.address, h.city, h.country_code, h.lat, h.lng, h.stars, h.rating, h.review_count, h.hotel_type,
            h.main_photo_url, coalesce(ARRAY(SELECT jsonb_array_elements_text(h.facility_ids)::int), '{}'), now()
       FROM jsonb_to_recordset($1::text::jsonb) AS h(id text, name text, address text, city text, country_code text,
            lat float8, lng float8, stars numeric, rating numeric, review_count int, hotel_type text, main_photo_url text,
            facility_ids jsonb)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name, address = excluded.address, city = excluded.city, country_code = excluded.country_code,
       lat = excluded.lat, lng = excluded.lng, stars = excluded.stars, rating = excluded.rating,
       review_count = excluded.review_count, hotel_type = excluded.hotel_type, main_photo_url = excluded.main_photo_url,
       facility_ids = excluded.facility_ids, content_fetched_at = now()`,
    [
      json(
        hotels.map((h) => ({
          id: h.id,
          name: h.name,
          address: h.address,
          city: h.city,
          country_code: h.countryCode,
          lat: h.lat,
          lng: h.lng,
          stars: h.stars,
          rating: h.rating,
          review_count: h.reviewCount,
          hotel_type: h.hotelType,
          main_photo_url: h.mainPhotoUrl,
          facility_ids: h.facilityIds,
        })),
      ),
    ],
  );
}

/** Idempotent: the unique key (combination, hotel, kind) makes repeated steps overwrite. */
export async function upsertOffers(db: Queryable, searchId: string, combinationId: number, offers: readonly NormalizedOffer[]): Promise<void> {
  if (offers.length === 0) return;
  await db.query(
    `INSERT INTO app.offers (search_id, combination_id, hotel_id, offer_kind, liteapi_offer_id, room_name, board_type, refundable,
                             free_cancel_until, total_price_cents, pay_at_property_cents, pay_at_property_known, currency, nights,
                             price_per_night_cents)
     SELECT $1::uuid, $2::bigint, o.hotel_id, o.kind, o.offer_id, o.room_name, o.board_type, o.refundable,
            o.free_cancel_until::timestamptz, o.total_cents, o.pay_cents, o.pay_known, o.currency, o.nights, o.per_night
       FROM jsonb_to_recordset($3::text::jsonb) AS o(hotel_id text, kind text, offer_id text, room_name text, board_type text,
            refundable boolean, free_cancel_until text, total_cents int, pay_cents int, pay_known boolean, currency text, nights int,
            per_night int)
     ON CONFLICT (combination_id, hotel_id, offer_kind) DO UPDATE SET
       liteapi_offer_id = excluded.liteapi_offer_id, room_name = excluded.room_name, board_type = excluded.board_type,
       refundable = excluded.refundable, free_cancel_until = excluded.free_cancel_until,
       total_price_cents = excluded.total_price_cents, pay_at_property_cents = excluded.pay_at_property_cents,
       pay_at_property_known = excluded.pay_at_property_known, currency = excluded.currency, nights = excluded.nights,
       price_per_night_cents = excluded.price_per_night_cents`,
    [
      searchId,
      combinationId,
      json(
        offers.map((o) => ({
          hotel_id: o.hotelId,
          kind: o.kind,
          offer_id: o.offerId,
          room_name: o.roomName,
          board_type: o.boardType,
          refundable: o.refundable,
          free_cancel_until: o.freeCancelUntil,
          total_cents: o.totalCents,
          pay_cents: o.payAtPropertyCents,
          pay_known: o.payAtPropertyKnown,
          currency: o.currency,
          nights: o.nights,
          per_night: o.pricePerNightCents,
        })),
      ),
    ],
  );
}

export type CacheNamespace = 'rates' | 'reference_price' | 'hotel_content';

export async function getCacheEntry<T>(db: Queryable, namespace: CacheNamespace, key: string, now: Date): Promise<T | null> {
  const rows = await db.query<{ value: string }>(
    'SELECT value::text AS value FROM app.cache_entries WHERE namespace = $1 AND key = $2 AND expires_at > $3::timestamptz',
    [namespace, key, now.toISOString()],
  );
  return rows[0] ? (JSON.parse(rows[0].value) as T) : null;
}

export async function putCacheEntry(db: Queryable, namespace: CacheNamespace, key: string, value: unknown, expiresAt: Date): Promise<void> {
  await db.query(
    `INSERT INTO app.cache_entries (namespace, key, value, expires_at) VALUES ($1, $2, $3::text::jsonb, $4::timestamptz)
     ON CONFLICT (namespace, key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
    [namespace, key, json(value), expiresAt.toISOString()],
  );
}

export interface ProgressCell {
  placeId: string;
  checkin: string;
  checkout: string;
  status: CombinationStatus;
  offersCount: number;
  minTotalCents: number | null;
}

export interface SearchPlaceRow {
  placeId: string;
  name: string;
  driveMinutes: number | null;
  source: 'suggested' | 'user';
}

export async function searchPlaces(db: Queryable, searchId: string): Promise<SearchPlaceRow[]> {
  const rows = await db.query<{ place_id: string; name: string; drive_minutes: number | null; source: 'suggested' | 'user' }>(
    `SELECT sp.place_id::text AS place_id, p.name, sp.drive_minutes, sp.source
       FROM app.search_places sp JOIN app.places p ON p.id = sp.place_id
      WHERE sp.search_id = $1::uuid ORDER BY sp.sort`,
    [searchId],
  );
  return rows.map((r) => ({ placeId: r.place_id, name: r.name, driveMinutes: r.drive_minutes, source: r.source }));
}

/** Matrix cells for the progress view: state and cheapest total per place × date. */
export async function progressCells(db: Queryable, searchId: string): Promise<ProgressCell[]> {
  const rows = await db.query<{
    place_id: string;
    checkin: string;
    checkout: string;
    status: CombinationStatus;
    offers_count: number;
    min_total: number | null;
  }>(
    `SELECT c.place_id::text AS place_id, c.checkin::text AS checkin, c.checkout::text AS checkout, c.status, c.offers_count,
            (SELECT min(o.total_price_cents) FROM app.offers o WHERE o.combination_id = c.id) AS min_total
       FROM app.search_combinations c WHERE c.search_id = $1::uuid ORDER BY c.id`,
    [searchId],
  );
  return rows.map((r) => ({
    placeId: r.place_id,
    checkin: r.checkin,
    checkout: r.checkout,
    status: r.status,
    offersCount: Number(r.offers_count),
    minTotalCents: r.min_total === null ? null : Number(r.min_total),
  }));
}

export async function countOffers(db: Queryable, searchId: string): Promise<number> {
  const rows = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM app.offers WHERE search_id = $1::uuid', [searchId]);
  return Number(rows[0]?.n ?? 0);
}

export interface EvaluationOfferRow {
  id: string;
  hotelId: string;
  placeId: string;
  placeName: string;
  checkin: string;
  checkout: string;
  kind: 'cheapest' | 'cheapest_refundable';
  offerId: string;
  roomName: string;
  boardType: 'RO' | 'BB' | 'HB' | 'FB' | 'AI' | 'OTHER';
  refundable: boolean;
  freeCancelUntil: string | null;
  totalCents: number;
  pricePerNightCents: number;
  payAtPropertyCents: number;
  payAtPropertyKnown: boolean;
  currency: string;
  nights: number;
}

export interface EvaluationHotelRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  stars: number | null;
  rating: number | null;
  reviewCount: number | null;
  hotelType: string | null;
  mainPhotoUrl: string | null;
  facilityIds: number[];
}

/** Everything the evaluation needs: offers with place and dates, hotels, combination states. */
export async function loadEvaluationData(db: Queryable, searchId: string) {
  const offers = await db.query<{
    id: number;
    hotel_id: string;
    place_id: string;
    place_name: string;
    checkin: string;
    checkout: string;
    offer_kind: 'cheapest' | 'cheapest_refundable';
    liteapi_offer_id: string;
    room_name: string;
    board_type: EvaluationOfferRow['boardType'];
    refundable: boolean;
    free_cancel_until: string | null;
    total_price_cents: number;
    price_per_night_cents: number;
    pay_at_property_cents: number;
    pay_at_property_known: boolean;
    currency: string;
    nights: number;
  }>(
    `SELECT o.id, o.hotel_id, c.place_id::text AS place_id, p.name AS place_name, c.checkin::text AS checkin, c.checkout::text AS checkout,
            o.offer_kind, o.liteapi_offer_id, o.room_name, o.board_type, o.refundable,
            to_char(o.free_cancel_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS free_cancel_until,
            o.total_price_cents, o.price_per_night_cents, o.pay_at_property_cents, o.pay_at_property_known, o.currency, o.nights
       FROM app.offers o
       JOIN app.search_combinations c ON c.id = o.combination_id
       JOIN app.places p ON p.id = c.place_id
      WHERE o.search_id = $1::uuid
      ORDER BY o.id`,
    [searchId],
  );
  const hotels = await db.query<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    stars: number | null;
    rating: number | null;
    review_count: number | null;
    hotel_type: string | null;
    main_photo_url: string | null;
    facility_ids: number[];
  }>(
    `SELECT h.id, h.name, h.address, h.city, h.stars::float8 AS stars, h.rating::float8 AS rating, h.review_count, h.hotel_type,
            h.main_photo_url, h.facility_ids
       FROM app.hotels h WHERE h.id IN (SELECT DISTINCT hotel_id FROM app.offers WHERE search_id = $1::uuid)`,
    [searchId],
  );
  const combinations = await db.query<{ place_id: string; checkin: string; checkout: string; status: CombinationStatus; updated_at: string }>(
    `SELECT place_id::text AS place_id, checkin::text AS checkin, checkout::text AS checkout, status,
            to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
       FROM app.search_combinations WHERE search_id = $1::uuid ORDER BY id`,
    [searchId],
  );
  return {
    offers: offers.map(
      (o): EvaluationOfferRow => ({
        id: String(o.id),
        hotelId: o.hotel_id,
        placeId: o.place_id,
        placeName: o.place_name,
        checkin: o.checkin,
        checkout: o.checkout,
        kind: o.offer_kind,
        offerId: o.liteapi_offer_id,
        roomName: o.room_name,
        boardType: o.board_type,
        refundable: o.refundable,
        freeCancelUntil: o.free_cancel_until,
        totalCents: Number(o.total_price_cents),
        pricePerNightCents: Number(o.price_per_night_cents),
        payAtPropertyCents: Number(o.pay_at_property_cents),
        payAtPropertyKnown: o.pay_at_property_known,
        currency: o.currency,
        nights: Number(o.nights),
      }),
    ),
    hotels: hotels.map(
      (h): EvaluationHotelRow => ({
        id: h.id,
        name: h.name,
        address: h.address,
        city: h.city,
        stars: h.stars === null ? null : Number(h.stars),
        rating: h.rating === null ? null : Number(h.rating),
        reviewCount: h.review_count === null ? null : Number(h.review_count),
        hotelType: h.hotel_type,
        mainPhotoUrl: h.main_photo_url,
        facilityIds: h.facility_ids.map(Number),
      }),
    ),
    combinations: combinations.map((c) => ({
      placeId: c.place_id,
      checkin: c.checkin,
      checkout: c.checkout,
      state: c.status,
      updatedAt: c.updated_at,
    })),
  };
}

export interface OfferEvaluation {
  id: string;
  passes: boolean;
  quality: number | null;
  breakdown: unknown;
  bargainTypes: string[];
  bargainReason: string | null;
  rankScore: number;
}

/** Persists the evaluation for the search's own filters (step score-1, idempotent). */
export async function saveEvaluation(db: Queryable, searchId: string, rows: readonly OfferEvaluation[]): Promise<void> {
  if (rows.length === 0) return;
  await db.query(
    `UPDATE app.offers o
        SET passes_filters = e.passes, quality_score = e.quality, score_breakdown = e.breakdown,
            bargain_types = coalesce(ARRAY(SELECT jsonb_array_elements_text(e.types)), '{}'), bargain_reason = e.reason, rank_score = e.rank
       FROM jsonb_to_recordset($2::text::jsonb) AS e(id bigint, passes boolean, quality numeric, breakdown jsonb, types jsonb, reason text, rank numeric)
      WHERE o.id = e.id AND o.search_id = $1::uuid`,
    [
      searchId,
      json(
        rows.map((r) => ({
          id: Number(r.id),
          passes: r.passes,
          quality: r.quality,
          breakdown: r.breakdown,
          types: r.bargainTypes,
          reason: r.bargainReason,
          rank: r.rankScore,
        })),
      ),
    ],
  );
}
