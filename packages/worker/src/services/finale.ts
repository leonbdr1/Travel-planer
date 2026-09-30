// Finale (konzept.md 9.9, 9.10; architektur.md 6.15): the automatic
// pre-selection for the traveller's goal and the comparison of the finalists.
// It reads the same evaluation as the result list (filters from the query,
// review checks as stage 2) and never recommends a favourite: the cheapest
// finalist comes first, every other one shows its surcharge and what it
// brings or lacks.
import type { FinaleResponse, FinalistDto, SearchRequest } from '@reiseplaner/contracts';
import type { ProviderSource } from '@reiseplaner/providers';
import { searchPlaces, type Queryable, type SearchRow } from '@reiseplaner/db';
import { compareFinalists, DEFAULT_GOAL, preselect, type Goal, type HotelEvidence } from '@reiseplaner/domain';
import { effectiveFilters, evaluateSearch, filtersFromQuery, filtersFromRequest, hotelSummary, offerDto, preselectHotels, qualityDto } from './results';
import { loadLocationFacts } from './location';
import { loadReviewData, NO_REVIEW_DATA } from './reviews';

export async function buildFinale(
  db: Queryable,
  search: Pick<SearchRow, 'id' | 'status'>,
  request: SearchRequest,
  query: Record<string, string | undefined> & { goal?: Goal | undefined },
  location: { source: ProviderSource; now: Date },
): Promise<FinaleResponse> {
  const filters = filtersFromQuery(query, filtersFromRequest(request));
  const reviews = await loadReviewData(db, search.id, filters.chips).catch(() => NO_REVIEW_DATA);
  const data = await evaluateSearch(db, search.id, filters, reviews, location.now);
  const goal = query.goal ?? request.goal ?? DEFAULT_GOAL;
  const evidence: ReadonlyMap<string, HotelEvidence> = reviews.evidence ?? new Map();
  // Location facts exist for the likely finalists (step `location-facts`); others compare without them.
  const facts = await loadLocationFacts(db, location.source, data.hotels.map((h) => h.id), location.now).catch(() => new Map());
  const selection = preselect({ goal, evaluated: data.evaluated, hotels: preselectHotels(data.hotels, facts), evidence });

  const places = new Map((await searchPlaces(db, search.id)).map((p) => [p.placeId, { lat: p.lat, lng: p.lng }]));
  const entries = compareFinalists(
    selection.finalists.map((offer) => {
      const h = data.hotelsById.get(offer.hotelId);
      return {
        offer,
        hotel: {
          facilityIds: h?.facilityIds ?? [],
          hotelType: h?.hotelType ?? null,
          facts: facts.get(offer.hotelId) ?? null,
          location: h && h.lat !== null && h.lng !== null ? { lat: h.lat, lng: h.lng } : null,
        },
        place: places.get(offer.placeId) ?? null,
        labels: evidence.get(offer.hotelId)?.labels ?? [],
      };
    }),
  );
  const finalists: FinalistDto[] = entries.map((e) => ({
    hotel: hotelSummary(e.offer.hotelId, data.hotelsById),
    offer: offerDto(e.offer),
    quality: qualityDto(e.offer),
    warnings: reviews.warnings.get(e.offer.hotelId) ?? [],
    review_status: reviews.status.get(e.offer.hotelId) ?? 'none',
    labels: reviews.labels?.get(e.offer.hotelId) ?? [],
    features: e.features,
    price_delta_eur: e.priceDeltaCents / 100,
    gains: e.gains,
    losses: e.losses,
    quality_delta: e.qualityDelta,
    other_place: e.otherPlace,
    other_dates: e.otherDates,
    center_distance_km: e.centerDistanceKm,
    location: e.location,
    recommended: e.offer.hotelId === selection.recommendedHotelId,
  }));
  return {
    search: { id: search.id, status: search.status },
    goal,
    filters: effectiveFilters(filters),
    finalists,
    excluded: selection.excluded,
    runners_up: selection.runnersUp.length,
    hotels: new Set(data.evaluated.map((o) => o.hotelId)).size,
  };
}
