// Search evaluation for the workflow step `score-1` and the results
// endpoints (architektur.md 6.6–6.9): offers and hotels from the database,
// filters from the request or the query, ranking from packages/domain.
import {
  searchRequestSchema,
  type EffectiveFilters,
  type MatrixCellDto,
  type OfferDto,
  type PraiseLabelDto,
  type ResultItem,
  type SearchRequest,
  type WarningDto,
} from '@reiseplaner/contracts';
import { getSearch, loadEvaluationData, saveEvaluation, setSearchStatus, type EvaluationHotelRow, type Queryable } from '@reiseplaner/db';
import {
  buildMatrix,
  evaluateOffers,
  hotelList,
  type BoardType,
  type EvalHotel,
  type EvaluatedOffer,
  type FilterSettings,
  type HotelEvidence,
  type PreselectHotel,
  type ReviewSignals,
  type SortKey,
} from '@reiseplaner/domain';

export async function loadSearchRequest(db: Queryable, searchId: string): Promise<SearchRequest> {
  const search = await getSearch(db, searchId);
  if (!search) throw new Error(`search ${searchId} not found`);
  return searchRequestSchema.parse(search.request);
}

const BOARDS: readonly BoardType[] = ['RO', 'BB', 'HB', 'FB', 'AI', 'OTHER'];

export function filtersFromRequest(request: SearchRequest): FilterSettings {
  return {
    budgetTotalCents: request.budget_total_eur === null ? null : request.budget_total_eur * 100,
    minStars: request.filters.min_stars,
    minRating: request.filters.min_rating,
    minReviews: request.filters.min_reviews,
    propertyTypes: request.filters.property_types,
    refundableOnly: request.filters.refundable_only,
    board: request.filters.board,
    chips: request.chips,
  };
}

const num = (v: string | undefined, base: number | null): number | null => {
  if (v === undefined) return base;
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : base;
};

/** Query parameters override the search's own filters; an empty value clears a filter. */
export function filtersFromQuery(q: Record<string, string | undefined>, base: FilterSettings): FilterSettings {
  const budget = num(q.budget, base.budgetTotalCents === null ? null : base.budgetTotalCents / 100);
  const board = q.board === undefined ? base.board : BOARDS.includes(q.board as BoardType) ? (q.board as BoardType) : null;
  return {
    budgetTotalCents: budget === null ? null : Math.round(budget * 100),
    minStars: num(q.min_stars, base.minStars),
    minRating: num(q.min_rating, base.minRating),
    minReviews: num(q.min_reviews, base.minReviews),
    propertyTypes: q.types === undefined ? base.propertyTypes : q.types.split(',').filter(Boolean),
    refundableOnly: q.refundable === undefined ? base.refundableOnly : q.refundable === 'true',
    board,
    chips: q.chips === undefined ? base.chips : q.chips.split(',').filter(Boolean),
  };
}

export function effectiveFilters(f: FilterSettings): EffectiveFilters {
  return {
    budget_total_eur: f.budgetTotalCents === null ? null : f.budgetTotalCents / 100,
    min_stars: f.minStars,
    min_rating: f.minRating,
    min_reviews: f.minReviews,
    property_types: f.propertyTypes,
    refundable_only: f.refundableOnly,
    board: f.board,
    chips: f.chips,
  };
}

export interface ReviewData {
  signals: ReadonlyMap<string, ReviewSignals | null>;
  warnings: ReadonlyMap<string, WarningDto[]>;
  status: ReadonlyMap<string, 'ok' | 'unverified'>;
  /** Number of reviews the check analysed, per hotel. */
  checked?: ReadonlyMap<string, number>;
  /** Praise labels per hotel, the most praised first. */
  labels?: ReadonlyMap<string, PraiseLabelDto[]>;
  /** What the review check found, for the automatic pre-selection. */
  evidence?: ReadonlyMap<string, HotelEvidence>;
}

export const NO_REVIEWS: ReviewData = { signals: new Map(), warnings: new Map(), status: new Map() };

export async function evaluateSearch(db: Queryable, searchId: string, filters: FilterSettings, reviews: ReviewData = NO_REVIEWS) {
  const data = await loadEvaluationData(db, searchId);
  const hotels = new Map<string, EvalHotel>(data.hotels.map((h) => [h.id, h]));
  const evaluated = evaluateOffers(data.offers, hotels, filters, reviews.signals);
  return { ...data, hotelsById: new Map(data.hotels.map((h) => [h.id, h])), evaluated };
}

/** Hotels as the pre-selection sees them: stars (never a quality signal), facilities, type. */
export function preselectHotels(hotels: readonly EvaluationHotelRow[]): Map<string, PreselectHotel> {
  return new Map(hotels.map((h) => [h.id, { id: h.id, stars: h.stars, facilityIds: h.facilityIds, hotelType: h.hotelType }]));
}

type SummaryHotel = Pick<EvaluationHotelRow, 'id' | 'name' | 'stars' | 'rating' | 'reviewCount' | 'hotelType' | 'city' | 'mainPhotoUrl'>;

export function hotelSummary(hotelId: string, hotels: ReadonlyMap<string, SummaryHotel>): ResultItem['hotel'] {
  const h = hotels.get(hotelId);
  return {
    id: hotelId,
    name: h?.name ?? hotelId,
    stars: h?.stars ?? null,
    rating: h?.rating ?? null,
    review_count: h?.reviewCount ?? null,
    hotel_type: h?.hotelType ?? null,
    city: h?.city ?? null,
    photo_url: h?.mainPhotoUrl ?? null,
  };
}

export function qualityDto(o: EvaluatedOffer): ResultItem['quality'] {
  return { score: o.quality, checked: o.breakdown.recency.checked, no_reviews: o.quality === null };
}

export function offerDto(o: EvaluatedOffer & { nights?: number }): OfferDto {
  return {
    id: o.id,
    hotel_id: o.hotelId,
    place_id: o.placeId,
    place_name: o.placeName,
    checkin: o.checkin,
    checkout: o.checkout,
    nights: Math.round(o.totalCents / o.pricePerNightCents),
    kind: o.kind,
    room_name: o.roomName,
    board_type: o.boardType,
    refundable: o.refundable,
    free_cancel_until: o.freeCancelUntil,
    total_price_eur: o.totalCents / 100,
    price_per_night_eur: o.pricePerNightCents / 100,
    pay_at_property_eur: o.payAtPropertyCents / 100,
    pay_at_property_known: o.payAtPropertyKnown,
    passes_filters: o.passes,
    bargain: o.bargain,
    rank_score: o.rankScore,
  };
}

export function matrixCells(
  combinations: ReadonlyArray<{ placeId: string; checkin: string; checkout: string; state: 'pending' | 'done' | 'cached' | 'failed' }>,
  evaluated: readonly EvaluatedOffer[],
): MatrixCellDto[] {
  return buildMatrix(combinations, evaluated).map((c) => ({
    place_id: c.placeId,
    checkin: c.checkin,
    checkout: c.checkout,
    state: c.state,
    offer_id: c.offer?.id ?? null,
    hotel_id: c.offer?.hotelId ?? null,
    total_price_eur: c.offer ? c.offer.totalCents / 100 : null,
    price_bucket: c.priceBucket,
    bargain: Boolean(c.offer?.bargain),
  }));
}

export function resultItems(evaluated: readonly EvaluatedOffer[], hotels: ReadonlyMap<string, SummaryHotel>, sort: SortKey, reviews: ReviewData): ResultItem[] {
  return hotelList(evaluated, sort).map(({ offer, otherDatesCount }) => ({
    hotel: hotelSummary(offer.hotelId, hotels),
    best_offer: offerDto(offer),
    other_dates_count: otherDatesCount,
    quality: qualityDto(offer),
    warnings: reviews.warnings.get(offer.hotelId) ?? [],
    review_status: reviews.status.get(offer.hotelId) ?? 'none',
    reviews_checked: reviews.checked?.get(offer.hotelId) ?? null,
    labels: reviews.labels?.get(offer.hotelId) ?? [],
  }));
}

/** Workflow step `score-1`: evaluation for the search's own filters, stored with the offers. */
export async function runScore(db: Queryable, searchId: string, request: SearchRequest, reviews: ReviewData = NO_REVIEWS, nextStatus: 'reviewing' | null = 'reviewing') {
  const { evaluated } = await evaluateSearch(db, searchId, filtersFromRequest(request), reviews);
  await saveEvaluation(
    db,
    searchId,
    evaluated.map((o) => ({
      id: o.id,
      passes: o.passes,
      quality: o.quality,
      breakdown: o.breakdown,
      bargainTypes: o.bargain?.types ?? [],
      bargainReason: o.bargain?.reason ?? null,
      rankScore: o.rankScore,
    })),
  );
  if (nextStatus) await setSearchStatus(db, searchId, nextStatus);
  const passing = evaluated.filter((o) => o.passes);
  return { offers: evaluated.length, passing: passing.length, bargains: passing.filter((o) => o.bargain).length };
}
