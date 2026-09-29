// Offer normalization (architektur.md 6.5): per hotel and combination at most
// two offers, the cheapest overall and the cheapest refundable one (if it is
// a different offer). Money in integer cents.
import type { BoardType, CancelPolicyStep, HotelRates, HotelSummary, IsoTimestamp, RateOption } from './types';

export type OfferKind = 'cheapest' | 'cheapest_refundable';

export interface NormalizedOffer {
  hotelId: string;
  kind: OfferKind;
  offerId: string;
  roomName: string;
  boardType: BoardType;
  refundable: boolean;
  freeCancelUntil: IsoTimestamp | null;
  totalCents: number;
  payAtPropertyCents: number;
  payAtPropertyKnown: boolean;
  currency: string;
  nights: number;
  pricePerNightCents: number;
}

/** End of free cancellation: the first policy step with a penalty (null = none known). */
export function freeCancelUntil(option: Pick<RateOption, 'refundable' | 'cancelPolicy'>): IsoTimestamp | null {
  if (!option.refundable) return null;
  const penalties = option.cancelPolicy
    .filter((s: CancelPolicyStep) => s.penaltyCents > 0)
    .map((s) => s.from)
    .sort();
  return penalties[0] ?? null;
}

export function payAtProperty(option: Pick<RateOption, 'taxes'>): { cents: number; known: boolean } {
  if (option.taxes === null) return { cents: 0, known: false };
  return { cents: option.taxes.filter((t) => !t.included).reduce((s, t) => s + t.amountCents, 0), known: true };
}

export function toOffer(hotelId: string, kind: OfferKind, option: RateOption, nights: number): NormalizedOffer {
  const pay = payAtProperty(option);
  return {
    hotelId,
    kind,
    offerId: option.offerId,
    roomName: option.roomName,
    boardType: option.boardType,
    refundable: option.refundable,
    freeCancelUntil: freeCancelUntil(option),
    totalCents: option.totalCents,
    payAtPropertyCents: pay.cents,
    payAtPropertyKnown: pay.known,
    currency: option.currency,
    nights,
    pricePerNightCents: Math.round(option.totalCents / nights),
  };
}

export function normalizeOffers(rates: readonly HotelRates[], nights: number): NormalizedOffer[] {
  const out: NormalizedOffer[] = [];
  for (const hotel of rates) {
    const valid = hotel.options.filter((o) => Number.isInteger(o.totalCents) && o.totalCents > 0);
    if (valid.length === 0) continue;
    const sorted = [...valid].sort((a, b) => a.totalCents - b.totalCents || a.offerId.localeCompare(b.offerId));
    const cheapest = sorted[0] as RateOption;
    out.push(toOffer(hotel.hotelId, 'cheapest', cheapest, nights));
    const refundable = sorted.find((o) => o.refundable);
    if (refundable && refundable.offerId !== cheapest.offerId) {
      out.push(toOffer(hotel.hotelId, 'cheapest_refundable', refundable, nights));
    }
  }
  return out;
}

/**
 * The current version of an offer the guest chose: same room, board and
 * cancellation kind, cheapest first. Rate ids only live for a short time at the
 * supplier, so a stale one is re-quoted by looking for its equivalent. Null when
 * the tariff is gone (the guest is then told it is no longer available, never
 * moved to a different tariff without knowing).
 */
export function findEquivalentOption(
  options: readonly RateOption[],
  wanted: { roomName: string; boardType: string; refundable: boolean },
): RateOption | null {
  const matches = options
    .filter(
      (o) =>
        Number.isInteger(o.totalCents) &&
        o.totalCents > 0 &&
        o.roomName === wanted.roomName &&
        o.boardType === wanted.boardType &&
        o.refundable === wanted.refundable,
    )
    .sort((a, b) => a.totalCents - b.totalCents || a.offerId.localeCompare(b.offerId));
  return matches[0] ?? null;
}

/** Guest rating on a 0–10 scale (architektur.md 5.3). */
export function normalizedRating(hotel: Pick<HotelSummary, 'rating' | 'ratingScale'>): number | null {
  if (hotel.rating === null) return null;
  const value = hotel.ratingScale === 5 ? hotel.rating * 2 : hotel.rating;
  return Math.round(Math.min(10, Math.max(0, value)) * 100) / 100;
}
