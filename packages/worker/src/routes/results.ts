// GET /api/v1/searches/{id}/results and /searches/{id}/hotels/{hotel_id}
// (architektur.md 6.9, 7.2): filters and sorting without a new search,
// every hotel once in the list, matrix with price buckets, hotel detail with
// all dates and the score breakdown. Requires the search token.
import { Hono } from 'hono';
import { hotelDetailResponseSchema, resultsQuerySchema, type HotelDetailResponse, type SearchResultsResponse } from '@reiseplaner/contracts';
import { getCacheEntry, putCacheEntry, searchPlaces } from '@reiseplaner/db';
import { constants, type HotelDetails } from '@reiseplaner/domain';
import { searchRequestSchema } from '@reiseplaner/contracts';
import type { AppEnv } from '../app';
import { ApiError } from '../http/errors';
import { parseQuery } from '../http/validate';
import { sha256Hex } from '../services/search-run';
import { effectiveFilters, evaluateSearch, filtersFromQuery, filtersFromRequest, matrixCells, offerDto, resultItems } from '../services/results';
import { loadReviewData, NO_REVIEW_DATA } from '../services/reviews';
import { authorizedSearch } from './searches';

export const resultRoutes = new Hono<AppEnv>()
  .get('/:id/results', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const query = parseQuery(c, resultsQuerySchema);
    const db = c.get('deps').db();
    const request = searchRequestSchema.parse(search.request);
    const filters = filtersFromQuery(query, filtersFromRequest(request));
    const reviews = await loadReviewData(db, search.id, filters.chips).catch(() => NO_REVIEW_DATA);
    const data = await evaluateSearch(db, search.id, filters, reviews);
    const cell = query.place_id && query.checkin ? { place_id: query.place_id, checkin: query.checkin } : null;
    const scoped = cell ? data.evaluated.filter((o) => o.placeId === cell.place_id && o.checkin === cell.checkin) : data.evaluated;
    const places = await searchPlaces(db, search.id);
    const dates = [...new Map(data.combinations.map((x) => [x.checkin, { checkin: x.checkin, checkout: x.checkout }])).values()].sort((a, b) =>
      a.checkin.localeCompare(b.checkin),
    );
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
      matrix: {
        places: places.map((p) => ({ id: p.placeId, name: p.name, drive_minutes: p.driveMinutes })),
        dates,
        cells: matrixCells(data.combinations, data.evaluated),
      },
      items: resultItems(scoped, data.hotelsById, query.sort, reviews),
      counts: {
        offers: data.evaluated.length,
        passing: passing.length,
        hotels: new Set(passing.map((o) => o.hotelId)).size,
        bargains: passing.filter((o) => o.bargain).length,
      },
      meta: { prices_fetched_at: fetched, sort: query.sort, cell },
    };
    return c.json(body);
  })
  .get('/:id/hotels/:hotelId', async (c) => {
    const search = await authorizedSearch(c, c.req.param('id'));
    const hotelId = c.req.param('hotelId');
    const deps = c.get('deps');
    const db = deps.db();
    const request = searchRequestSchema.parse(search.request);
    const filters = filtersFromQuery(c.req.query(), filtersFromRequest(request));
    const reviews = await loadReviewData(db, search.id, filters.chips).catch(() => NO_REVIEW_DATA);
    const data = await evaluateSearch(db, search.id, filters, reviews);
    const offers = data.evaluated.filter((o) => o.hotelId === hotelId);
    const hotel = data.hotelsById.get(hotelId);
    if (!hotel || offers.length === 0) throw new ApiError(404, 'not_found', 'Diese Unterkunft gehört nicht zu dieser Suche.');

    const key = await sha256Hex(`hotel|${hotelId}`);
    let details = await getCacheEntry<HotelDetails>(db, 'hotel_content', key, deps.now());
    if (!details) {
      try {
        details = await deps.providers().liteapi.getHotel(hotelId);
        await putCacheEntry(db, 'hotel_content', key, details, new Date(deps.now().getTime() + constants.HOTEL_CONTENT_TTL_DAYS * 86_400_000));
      } catch {
        details = null;
      }
    }
    const first = offers[0];
    const body: HotelDetailResponse = {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        stars: hotel.stars,
        rating: hotel.rating,
        review_count: hotel.reviewCount,
        hotel_type: hotel.hotelType,
        city: hotel.city,
        photo_url: hotel.mainPhotoUrl,
        address: details?.address ?? hotel.address,
        description: details?.description ?? null,
        photos: details?.photos.slice(0, 12) ?? [],
        facilities: details?.facilities.slice(0, 40) ?? [],
        checkin_time: details?.checkinTime ?? null,
        checkout_time: details?.checkoutTime ?? null,
        important_information: details?.importantInformation ?? null,
      },
      score: hotelDetailResponseSchema.shape.score.parse(first?.breakdown),
      offers: offers.sort((a, b) => a.checkin.localeCompare(b.checkin) || a.totalCents - b.totalCents).map(offerDto),
      review_check: reviews.checks?.get(hotelId) ?? null,
    };
    return c.json(body);
  });
