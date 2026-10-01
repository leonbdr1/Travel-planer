// GET /api/v1/searches/{id}/results, /searches/{id}/finale,
// /searches/{id}/hotels/{hotel_id} and
// /searches/{id}/hotels/{hotel_id}/reference-price (architektur.md 6.9, 6.15,
// 7.2): filters and sorting without a new search, every hotel once in the
// list, matrix with price buckets, the finale for a goal, hotel detail with
// all dates and the score breakdown, public reference price per offer.
// Requires the search token.
import { Hono } from 'hono';
import {
  finaleQuerySchema,
  hotelDetailResponseSchema,
  referencePriceQuerySchema,
  resultsQuerySchema,
  type FinaleResponse,
  type HotelDetailResponse,
  type ReferencePriceResponse,
  type SearchResultsResponse,
} from '@reiseplaner/contracts';
import { productConfig } from '@reiseplaner/config';
import { blocksLanguage, DEFAULT_GOAL, facilitiesDe, textBlocks } from '@reiseplaner/domain';
import { getSearchOffer, placesByIds, searchPlaces } from '@reiseplaner/db';
import { searchRequestSchema } from '@reiseplaner/contracts';
import type { AppEnv } from '../app';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rate-limit';
import { parseQuery } from '../http/validate';
import { cachedHotelDetails, fetchHotelDetails } from '../services/hotel-content';
import {
  admissibleFor,
  effectiveFilters,
  evaluateSearch,
  filtersFromQuery,
  filtersFromRequest,
  matchingName,
  matrixCells,
  nightsSummary,
  offerDto,
  oversizedItems,
  resultItems,
  unratedFor,
  unratedItems,
} from '../services/results';
import { buildFinale } from '../services/finale';
import { referencePriceFor } from '../services/reference-price';
import { loadReviewData, NO_REVIEW_DATA } from '../services/reviews';
import { authorizedSearch } from './searches';

const MINUTE_S = 60;

export const resultRoutes = new Hono<AppEnv>()
  .get('/:id/results', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const { offset = 0, limit, q, ...query } = parseQuery(c, resultsQuerySchema);
    const db = c.get('deps').db();
    const request = searchRequestSchema.parse(search.request);
    const filters = filtersFromQuery(query, filtersFromRequest(request));
    // Independent reads go out together (one connection pipelines them).
    const [reviews, places] = await Promise.all([loadReviewData(db, search.id, filters.chips).catch(() => NO_REVIEW_DATA), searchPlaces(db, search.id)]);
    const [data, placeRowList] = await Promise.all([evaluateSearch(db, search.id, filters, reviews, c.get('deps').now()), placesByIds(db, places.map((p) => p.placeId))]);
    const placeRows = new Map(placeRowList.map((p) => [p.id, p]));
    const goal = query.goal ?? request.goal ?? DEFAULT_GOAL;
    const admissible = admissibleFor(goal, data.evaluated, data.hotels, reviews);
    const doubts = unratedFor(goal, data.evaluated, data.hotels, reviews);
    const cell = query.place_id && query.checkin ? { place_id: query.place_id, checkin: query.checkin, checkout: query.checkout ?? null } : null;
    const scoped = cell
      ? data.evaluated.filter((o) => o.placeId === cell.place_id && o.checkin === cell.checkin && (cell.checkout === null || o.checkout === cell.checkout))
      : data.evaluated;
    const dates = [...new Map(data.combinations.map((x) => [`${x.checkin}|${x.checkout}`, { checkin: x.checkin, checkout: x.checkout }])).values()].sort(
      (a, b) => a.checkin.localeCompare(b.checkin) || a.checkout.localeCompare(b.checkout),
    );
    const driveMinutes = new Map(places.map((p) => [p.placeId, p.driveMinutes]));
    const all = resultItems(scoped, data.hotelsById, query.sort, reviews, { goal, admissible, driveMinutes });
    // The name search narrows the lists, the page cuts the main list; the summary looks at all.
    const items = matchingName(all, q);
    const passing = data.evaluated.filter((o) => o.passes);
    const fetched = data.combinations.map((x) => x.updatedAt).sort().at(-1) ?? null;
    const body: SearchResultsResponse = {
      search: {
        id: search.id,
        status: search.status,
        combos_total: search.combosTotal,
        combos_done: search.combosDone,
        combos_failed: search.combosFailed,
      },
      filters: effectiveFilters(filters),
      request,
      matrix: {
        places: places.map((p) => ({ id: p.placeId, name: p.name, drive_minutes: p.driveMinutes, attractiveness: placeRows.get(p.placeId)?.attractiveness ?? null })),
        dates,
        cells: matrixCells(data.combinations, data.evaluated, admissible, data.hotelsById),
      },
      items: limit === undefined ? items.slice(offset) : items.slice(offset, offset + limit),
      unrated: matchingName(unratedItems(scoped, data.hotelsById, doubts), q),
      oversized: matchingName(oversizedItems(scoped, data.hotelsById), q),
      page: { offset, limit: limit ?? null, total: items.length },
      counts: {
        offers: data.evaluated.length,
        passing: passing.length,
        hotels: new Set(passing.map((o) => o.hotelId)).size,
        bargains: passing.filter((o) => o.bargain && admissible.has(o.hotelId)).length,
        listed: admissible.size,
        hidden: new Set(passing.filter((o) => !admissible.has(o.hotelId)).map((o) => o.hotelId)).size,
        unrated_hidden: doubts.size,
      },
      meta: { prices_fetched_at: fetched, sort: query.sort, goal, cell },
      nights_summary: nightsSummary(all),
    };
    return c.json(body);
  })
  .get('/:id/finale', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const query = parseQuery(c, finaleQuerySchema);
    const body: FinaleResponse = await buildFinale(c.get('deps').db(), search, searchRequestSchema.parse(search.request), query, {
      source: c.get('deps').providers().sources.poi,
      now: c.get('deps').now(),
    });
    return c.json(body);
  })
  .get('/:id/hotels/:hotelId', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const hotelId = c.req.param('hotelId');
    const deps = c.get('deps');
    const db = deps.db();
    const request = searchRequestSchema.parse(search.request);
    const filters = filtersFromQuery(c.req.query(), filtersFromRequest(request));
    // The cached provider details do not depend on the evaluation: read them alongside.
    const [reviews, cached] = await Promise.all([loadReviewData(db, search.id, filters.chips).catch(() => NO_REVIEW_DATA), cachedHotelDetails(db, hotelId, deps.now())]);
    const data = await evaluateSearch(db, search.id, filters, reviews, deps.now());
    const offers = data.evaluated.filter((o) => o.hotelId === hotelId);
    const hotel = data.hotelsById.get(hotelId);
    if (!hotel || offers.length === 0) throw new ApiError(404, 'not_found', 'Diese Unterkunft gehört nicht zu dieser Suche.');

    let details = cached;
    if (!details) details = await fetchHotelDetails(db, deps.providers().liteapi, hotelId, deps.now()).catch(() => null);
    const first = offers[0];
    // Provider texts come as HTML or lines; the SPA gets plain blocks.
    const description = textBlocks(details?.description);
    // Facilities in German (Aufgabe 12); unknown English names are logged so the table can grow (no personal data).
    const facilities = facilitiesDe(details?.facilities.slice(0, 60) ?? []);
    if (facilities.unknown.length > 0) console.log(JSON.stringify({ level: 'info', msg: 'facility untranslated', names: facilities.unknown }));
    const important = textBlocks(details?.importantInformation);
    const body: HotelDetailResponse = {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        stars: hotel.stars,
        rating: hotel.rating,
        review_count: hotel.reviewCount,
        rating_sources: hotel.ratingSources,
        hotel_type: hotel.hotelType,
        city: hotel.city,
        photo_url: hotel.mainPhotoUrl,
        address: details?.address ?? hotel.address,
        location: hotel.lat !== null && hotel.lng !== null ? { lat: hotel.lat, lng: hotel.lng } : null,
        description,
        description_language: blocksLanguage(description),
        photos: details?.photos.slice(0, 12) ?? [],
        facilities: facilities.groups.flatMap((g) => g.labels),
        facility_groups: facilities.groups,
        facilities_untranslated: facilities.unknown.length,
        checkin_time: details?.checkinTime ?? null,
        checkout_time: details?.checkoutTime ?? null,
        important_information: important,
        important_information_language: blocksLanguage(important),
      },
      score: hotelDetailResponseSchema.shape.score.parse(first?.breakdown),
      offers: offers.sort((a, b) => a.checkin.localeCompare(b.checkin) || a.totalCents - b.totalCents).map(offerDto),
      review_check: reviews.checks?.get(hotelId) ?? null,
      occupancy: { rooms: request.occupancy.rooms, adults: request.occupancy.adults, children: request.occupancy.children_ages.length },
    };
    return c.json(body);
  })
  .get(
    '/:id/hotels/:hotelId/reference-price',
    // Token first, so unknown searches never count against the limit.
    async (c, next) => {
      c.set('search', await authorizedSearch(c, c.req.param('id')));
      await next();
    },
    rateLimit('reference-price', productConfig.limits.rate_limits.reference_price_per_minute, MINUTE_S),
    async (c) => {
      const search = c.get('search');
      const { offer_id: offerId } = parseQuery(c, referencePriceQuerySchema);
      const deps = c.get('deps');
      const db = deps.db();
      const offer = await getSearchOffer(db, search.id, offerId);
      if (!offer || offer.hotelId !== c.req.param('hotelId')) throw new ApiError(404, 'not_found', 'Dieses Angebot gehört nicht zu dieser Suche.');
      const outcome = await referencePriceFor(
        { db, port: deps.providers().referencePrice, now: deps.now(), liteapiDailyCap: productConfig.limits.daily_quotas.liteapi_calls },
        searchRequestSchema.parse(search.request),
        offer,
      );
      const body: ReferencePriceResponse =
        outcome.status === 'ok'
          ? {
              status: 'ok',
              offer_id: offer.id,
              total_price_eur: outcome.totalCents / 100,
              currency: outcome.currency,
              source: outcome.source,
              fetched_at: outcome.fetchedAt,
            }
          : { status: 'unavailable', offer_id: offer.id, reason: outcome.reason };
      return c.json(body);
    },
  );
