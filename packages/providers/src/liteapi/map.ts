// Maps raw LiteAPI responses into the provider-neutral domain types.
import type {
  BoardType,
  CancelPolicyStep,
  GuestReview,
  HotelDetails,
  HotelRates,
  HotelSummary,
  RateOption,
  ReviewsResult,
  TaxOrFee,
} from '@reiseplaner/domain';
import type { z } from 'zod';
import type {
  hotelDetailsResponseSchema,
  rawCancelInfoSchema,
  rawHotelInfoSchema,
  rawRoomTypeSchema,
  RawRatesResponse,
  reviewsResponseSchema,
} from './schemas';

export const toCents = (amount: number): number => Math.round(amount * 100);

const BOARD_TYPES: readonly BoardType[] = ['RO', 'BB', 'HB', 'FB', 'AI'];
export function mapBoardType(code: string | null | undefined): BoardType {
  const upper = (code ?? '').toUpperCase();
  return (BOARD_TYPES as readonly string[]).includes(upper) ? (upper as BoardType) : upper ? 'OTHER' : 'RO';
}

/** `2026-10-01 18:00:00` (+ timezone GMT/UTC) → `2026-10-01T18:00:00Z`. */
export function toUtcIso(time: string, timezone?: string | null): string {
  const normalized = time.trim().replace(' ', 'T');
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(normalized)) return new Date(normalized).toISOString().replace('.000Z', 'Z');
  const tz = (timezone ?? 'GMT').toUpperCase();
  if (tz !== 'GMT' && tz !== 'UTC') {
    // Unknown zone: treat as UTC (conservative for "free until" is to be
    // earlier, which callers ensure by subtracting a safety margin).
  }
  return `${normalized.length === 10 ? `${normalized}T00:00:00` : normalized}Z`;
}

function mapCancelPolicy(infos: Array<z.infer<typeof rawCancelInfoSchema>> | null | undefined, currency: string): CancelPolicyStep[] {
  return (infos ?? [])
    .map((i) => ({ from: toUtcIso(i.cancelTime, i.timezone), penaltyCents: toCents(i.amount), currency: i.currency ?? currency }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

function mapTaxes(rate: z.infer<typeof rawRoomTypeSchema>['rates'][number], currency: string): TaxOrFee[] | null {
  const taxes = rate.retailRate.taxesAndFees;
  if (taxes === null || taxes === undefined) return null;
  return taxes.map((t) => ({
    amountCents: toCents(t.amount),
    currency: t.currency ?? currency,
    included: t.included,
    description: t.description ?? null,
  }));
}

export function mapRoomType(room: z.infer<typeof rawRoomTypeSchema>): RateOption {
  const first = room.rates[0]!;
  const currency = room.offerRetailRate?.currency ?? first.retailRate.total[0]!.currency;
  const total = room.offerRetailRate
    ? toCents(room.offerRetailRate.amount)
    : room.rates.reduce((sum, r) => sum + toCents(r.retailRate.total[0]!.amount), 0);
  const ssp =
    room.suggestedSellingPrice?.amount ??
    (first.retailRate.suggestedSellingPrice?.length
      ? room.rates.reduce((s, r) => s + (r.retailRate.suggestedSellingPrice?.[0]?.amount ?? 0), 0)
      : null);
  const taxLists = room.rates.map((r) => mapTaxes(r, currency));
  const taxes = taxLists.some((t) => t === null) ? null : taxLists.flatMap((t) => t ?? []);
  const tag = first.cancellationPolicies?.refundableTag ?? null;
  const policy = mapCancelPolicy(
    room.rates.flatMap((r) => r.cancellationPolicies?.cancelPolicyInfos ?? []),
    currency,
  );
  return {
    offerId: room.offerId,
    roomName: first.name,
    boardType: mapBoardType(first.boardType),
    boardName: first.boardName ?? null,
    totalCents: total,
    currency,
    suggestedSellingCents: ssp === null ? null : toCents(ssp),
    taxes,
    refundable: tag === 'RFN',
    cancelPolicy: policy,
    maxOccupancy: first.maxOccupancy ?? null,
  };
}

export function mapHotelInfo(info: z.infer<typeof rawHotelInfoSchema>): HotelSummary {
  return {
    id: info.id,
    name: info.name,
    address: info.address ?? null,
    city: info.city ?? null,
    countryCode: info.country ? info.country.toUpperCase() : null,
    lat: info.latitude ?? null,
    lng: info.longitude ?? null,
    stars: info.stars ?? info.starRating ?? null,
    rating: info.rating ?? null,
    ratingScale: 10,
    reviewCount: info.reviewCount ?? null,
    hotelType: info.hotelType ?? null,
    mainPhotoUrl: info.main_photo ?? info.thumbnail ?? null,
    facilityIds: info.facilityIds ?? [],
  };
}

export function mapRatesResponse(raw: RawRatesResponse): { rates: HotelRates[]; hotels: HotelSummary[] } {
  return {
    rates: (raw.data ?? []).map((h) => ({ hotelId: h.hotelId, options: h.roomTypes.map(mapRoomType) })),
    hotels: (raw.hotels ?? []).map(mapHotelInfo),
  };
}

export function mapHotelDetails(raw: z.infer<typeof hotelDetailsResponseSchema>): HotelDetails {
  const d = raw.data;
  return {
    id: d.id,
    name: d.name,
    address: d.address ?? null,
    city: d.city ?? null,
    countryCode: d.country ? d.country.toUpperCase() : null,
    lat: d.location?.latitude ?? null,
    lng: d.location?.longitude ?? null,
    stars: d.starRating ?? null,
    rating: d.rating ?? null,
    ratingScale: 10,
    reviewCount: d.reviewCount ?? null,
    hotelType: d.hotelType ?? null,
    mainPhotoUrl: d.main_photo ?? d.hotelImages?.find((i) => i.defaultImage)?.url ?? d.hotelImages?.[0]?.url ?? null,
    facilityIds: d.facilityIds ?? [],
    description: d.hotelDescription ?? null,
    photos: (d.hotelImages ?? []).map((i) => i.urlHd ?? i.url),
    facilities: d.hotelFacilities ?? [],
    phone: d.phone ?? null,
    email: d.email ?? null,
    checkinTime: d.checkinCheckoutTimes?.checkin ?? null,
    checkoutTime: d.checkinCheckoutTimes?.checkout ?? null,
    importantInformation: d.hotelImportantInformation ?? null,
  };
}

/** Drops author names (architektur.md 9.3) and normalises dates. */
export function mapReviews(raw: z.infer<typeof reviewsResponseSchema>): ReviewsResult {
  const reviews: GuestReview[] = (raw.data ?? []).map((r, index) => ({
    id: `r${index}`,
    score: r.averageScore ?? null,
    date: r.date ? r.date.slice(0, 10) : null,
    language: r.language ?? null,
    headline: r.headline ?? null,
    pros: r.pros ?? null,
    cons: r.cons ?? null,
  }));
  const categories = raw.sentimentAnalysis?.categories;
  return { reviews, sentiment: categories ? { categories } : null };
}
