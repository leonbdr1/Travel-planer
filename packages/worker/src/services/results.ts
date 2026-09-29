// Search evaluation for the workflow step `score-1` and the results
// endpoints (architektur.md 6.6–6.9): offers and hotels from the database,
// filters from the request or the query, ranking from packages/domain.
import {
  searchRequestSchema,
  type EffectiveFilters,
  type ExtraNightDto,
  type MatrixCellDto,
  type OfferDto,
  type PraiseLabelDto,
  type ResultItem,
  type SearchRequest,
  type SearchResultsResponse,
  type UnratedItem,
  type WarningDto,
} from '@reiseplaner/contracts';
import { getSearch, loadEvaluationData, saveEvaluation, setSearchStatus, type EvaluationHotelRow, type Queryable } from '@reiseplaner/db';
import {
  admissibleHotelIds,
  buildMatrix,
  byComparison,
  comparisonOf,
  evaluateOffers,
  extraNights,
  hotelList,
  offerFeatures,
  recommendedIndex,
  unratedDoubts,
  type BoardType,
  type Goal,
  type EvalHotel,
  type EvaluatedOffer,
  type FilterSettings,
  type HotelEvidence,
  type LocationFacts,
  type PreselectHotel,
  type ReviewSignals,
  type SortKey,
  type UnratedDoubt,
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
/** `facts`: location facts from OpenStreetMap where known (S11.5); they count in the comparison. */
export function preselectHotels(hotels: readonly EvaluationHotelRow[], facts?: ReadonlyMap<string, LocationFacts>): Map<string, PreselectHotel> {
  return new Map(
    hotels.map((h) => [h.id, { id: h.id, stars: h.stars, facilityIds: h.facilityIds, hotelType: h.hotelType, facts: facts?.get(h.id) ?? null }]),
  );
}

/** Houses that pass the goal's rules; lists and the matrix show only these. */
export function admissibleFor(goal: Goal, evaluated: readonly EvaluatedOffer[], hotels: readonly EvaluationHotelRow[], reviews: ReviewData): Set<string> {
  return admissibleHotelIds({ goal, evaluated, hotels: preselectHotels(hotels), evidence: reviews.evidence ?? new Map() });
}

/** Houses without reviews the goal's rules sort out, with the doubt; listed apart (Ben, 2026-09-29). */
export function unratedFor(goal: Goal, evaluated: readonly EvaluatedOffer[], hotels: readonly EvaluationHotelRow[], reviews: ReviewData): Map<string, UnratedDoubt> {
  return unratedDoubts({ goal, evaluated, hotels: preselectHotels(hotels), evidence: reviews.evidence ?? new Map() });
}

type SummaryHotel = Pick<EvaluationHotelRow, 'id' | 'name' | 'stars' | 'rating' | 'reviewCount' | 'ratingSources' | 'hotelType' | 'city' | 'mainPhotoUrl'>;
type ListHotel = SummaryHotel & Pick<EvaluationHotelRow, 'facilityIds'>;

export function hotelSummary(hotelId: string, hotels: ReadonlyMap<string, SummaryHotel>): ResultItem['hotel'] {
  const h = hotels.get(hotelId);
  return {
    id: hotelId,
    name: h?.name ?? hotelId,
    stars: h?.stars ?? null,
    rating: h?.rating ?? null,
    review_count: h?.reviewCount ?? null,
    rating_sources: h?.ratingSources ?? [],
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
    room_fit: o.roomFit ?? 'fits',
    room_capacity: o.roomCapacity ?? null,
    room_options: (o.roomOptions ?? []).map((r) => ({ room_name: r.roomName, total_eur: r.totalCents / 100, capacity: r.capacity, fit: r.fit })),
  };
}

export function matrixCells(
  combinations: ReadonlyArray<{ placeId: string; checkin: string; checkout: string; state: 'pending' | 'done' | 'cached' | 'failed' }>,
  evaluated: readonly EvaluatedOffer[],
  admissible: ReadonlySet<string> | null = null,
  hotels: ReadonlyMap<string, Pick<EvaluationHotelRow, 'name'>> = new Map(),
): MatrixCellDto[] {
  return buildMatrix(combinations, evaluated, admissible).map((c) => ({
    place_id: c.placeId,
    checkin: c.checkin,
    checkout: c.checkout,
    state: c.state,
    offer_id: c.offer?.id ?? null,
    hotel_id: c.offer?.hotelId ?? null,
    total_price_eur: c.offer ? c.offer.totalCents / 100 : null,
    price_bucket: c.priceBucket,
    bargain: Boolean(c.offer?.bargain),
    hotel_name: c.offer ? (hotels.get(c.offer.hotelId)?.name ?? null) : null,
    room_name: c.offer?.roomName ?? null,
    board_type: c.offer?.boardType ?? null,
    bargain_reason: c.offer?.bargain?.reason ?? null,
  }));
}

const nightsOf = (o: EvaluatedOffer) => Math.max(1, Math.round(o.totalCents / o.pricePerNightCents));

/** One night more of the same stay per offer id (Aufgabe 4), over the passing offers. */
export function extraNightsFor(evaluated: readonly EvaluatedOffer[]): Map<string, ExtraNightDto> {
  const steps = extraNights(evaluated.filter((o) => o.passes).map((o) => ({ ...o, nights: nightsOf(o) })));
  return new Map(
    [...steps].map(([id, x]) => [
      id,
      {
        from_nights: x.fromNights,
        to_nights: x.toNights,
        longer_offer_id: x.longerOfferId,
        extra_eur: x.extraCents / 100,
        nightly_eur: x.nightlyCents / 100,
        verdict: x.verdict,
      },
    ]),
  );
}

const median = (values: readonly number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

/** How the extra nights of the listed houses compare: the most common step (e.g. 2 → 3 nights). */
export function nightsSummary(items: readonly Pick<ResultItem, 'extra_night'>[]): SearchResultsResponse['nights_summary'] {
  const steps = items.map((i) => i.extra_night).filter((x): x is ExtraNightDto => x !== null);
  if (steps.length === 0) return null;
  const byStep = new Map<string, ExtraNightDto[]>();
  for (const x of steps) byStep.set(`${x.from_nights}|${x.to_nights}`, [...(byStep.get(`${x.from_nights}|${x.to_nights}`) ?? []), x]);
  const main = [...byStep.values()].sort((a, b) => b.length - a.length)[0] as ExtraNightDto[];
  const first = main[0] as ExtraNightDto;
  return {
    from_nights: first.from_nights,
    to_nights: first.to_nights,
    houses: main.length,
    cheap: main.filter((x) => x.verdict === 'cheap').length,
    normal: main.filter((x) => x.verdict === 'normal').length,
    expensive: main.filter((x) => x.verdict === 'expensive').length,
    median_extra_eur: Math.round(median(main.map((x) => x.extra_eur)) * 100) / 100,
    median_nightly_eur: Math.round(median(main.map((x) => x.nightly_eur)) * 100) / 100,
  };
}

/**
 * The list: every admissible house once with its cheapest passing offer,
 * cheapest first (or by comparison price or quality). The house with the
 * lowest comparison price among the listed ones is the recommendation.
 */
export function resultItems(
  evaluated: readonly EvaluatedOffer[],
  hotels: ReadonlyMap<string, ListHotel>,
  sort: SortKey,
  reviews: ReviewData,
  scope: { goal: Goal; admissible: ReadonlySet<string> | null },
): ResultItem[] {
  const listed = hotelList(
    evaluated.filter((o) => !scope.admissible || scope.admissible.has(o.hotelId)),
    'price',
  ).map((entry) => {
    const h = hotels.get(entry.offer.hotelId);
    const hotel = { facilityIds: h?.facilityIds ?? [], hotelType: h?.hotelType ?? null, reviewCount: entry.offer.breakdown.reviewCount, effectiveReviews: entry.offer.breakdown.effectiveReviews };
    const features = offerFeatures(hotel, entry.offer, reviews.evidence?.get(entry.offer.hotelId)?.labels ?? []).map((f) => f.code);
    return { ...entry, comparison: comparisonOf(entry.offer, features) };
  });
  const cmp = byComparison(scope.goal);
  if (sort === 'best') listed.sort((a, b) => cmp(a.comparison, b.comparison));
  if (sort === 'quality') listed.sort((a, b) => (b.offer.quality ?? -1) - (a.offer.quality ?? -1) || a.offer.totalCents - b.offer.totalCents);
  const recommended = recommendedIndex(listed.map((x) => x.comparison), scope.goal);
  const steps = extraNightsFor(evaluated);
  return listed.map(({ offer, otherDatesCount }, i) => ({
    hotel: hotelSummary(offer.hotelId, hotels),
    best_offer: offerDto(offer),
    other_dates_count: otherDatesCount,
    quality: qualityDto(offer),
    warnings: reviews.warnings.get(offer.hotelId) ?? [],
    review_status: reviews.status.get(offer.hotelId) ?? 'none',
    reviews_checked: reviews.checked?.get(offer.hotelId) ?? null,
    labels: reviews.labels?.get(offer.hotelId) ?? [],
    recommended: i === recommended,
    extra_night: steps.get(offer.id) ?? null,
  }));
}

/**
 * Houses that offer only rooms clearly larger than the party (Aufgabe 5):
 * each once with its cheapest such offer, cheapest first; never in the list,
 * the matrix or the recommendation.
 */
export function oversizedItems(evaluated: readonly EvaluatedOffer[], hotels: ReadonlyMap<string, SummaryHotel>): ResultItem[] {
  const withFitting = new Set(evaluated.filter((o) => o.passes).map((o) => o.hotelId));
  const best = new Map<string, { offer: EvaluatedOffer; count: number }>();
  for (const o of evaluated) {
    if (!o.oversized || withFitting.has(o.hotelId)) continue;
    const cur = best.get(o.hotelId);
    if (!cur) best.set(o.hotelId, { offer: o, count: 1 });
    else best.set(o.hotelId, { offer: o.totalCents < cur.offer.totalCents ? o : cur.offer, count: cur.count + 1 });
  }
  return [...best.values()]
    .sort((a, b) => a.offer.totalCents - b.offer.totalCents)
    .map(({ offer, count }) => ({
      hotel: hotelSummary(offer.hotelId, hotels),
      best_offer: offerDto(offer),
      other_dates_count: count - 1,
      quality: qualityDto(offer),
      warnings: [],
      review_status: 'none',
      reviews_checked: null,
      labels: [],
      recommended: false,
      extra_night: null,
    }));
}

/** The sorted-out houses without reviews in the list's scope: each once with its cheapest passing offer, cheapest first. */
export function unratedItems(evaluated: readonly EvaluatedOffer[], hotels: ReadonlyMap<string, SummaryHotel>, doubts: ReadonlyMap<string, UnratedDoubt>): UnratedItem[] {
  return hotelList(
    evaluated.filter((o) => doubts.has(o.hotelId)),
    'price',
  ).map(({ offer, otherDatesCount }) => {
    const doubt = doubts.get(offer.hotelId) as UnratedDoubt;
    return {
      hotel: hotelSummary(offer.hotelId, hotels),
      best_offer: offerDto(offer),
      other_dates_count: otherDatesCount,
      quality: qualityDto(offer),
      warnings: [],
      review_status: 'none',
      reviews_checked: null,
      labels: [],
      recommended: false,
      extra_night: null,
      doubt: {
        code: doubt.code,
        reference_per_night_eur: doubt.referencePerNightCents === null ? null : Math.round(doubt.referencePerNightCents) / 100,
      },
    };
  });
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
