// Offer normalization (architektur.md 6.5): per hotel and combination at most
// two offers, the cheapest overall and the cheapest refundable one (if it is
// a different offer). Money in integer cents. Since Aufgabe 5 both are chosen
// among the rooms that fit the party; a house with only rooms clearly larger
// than needed keeps its cheapest one, marked `oversized` (display only).
import { roomCapacity, roomFit, type RoomFit, type RoomOption } from './rooms';
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
  /** Fits the party or clearly larger than needed (Aufgabe 5). */
  roomFit: RoomFit;
  roomCapacity: number | null;
  /** Every room of the house on this date with its cheapest offer (on the `cheapest` offer only). */
  roomOptions: RoomOption[];
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

/**
 * Free cancellation as it stands at `now`: once the deadline has passed the
 * tariff's fees apply, so the offer no longer counts as free to cancel (the
 * filter, the badges and the booking see the same). Without a known deadline
 * a refundable tariff stays refundable.
 */
export function freeCancellationAt(
  offer: { refundable: boolean; freeCancelUntil: IsoTimestamp | null },
  now: Date,
): { refundable: boolean; freeCancelUntil: IsoTimestamp | null } {
  if (!offer.refundable) return { refundable: false, freeCancelUntil: null };
  if (offer.freeCancelUntil !== null && Date.parse(offer.freeCancelUntil) <= now.getTime()) return { refundable: false, freeCancelUntil: null };
  return { refundable: true, freeCancelUntil: offer.freeCancelUntil };
}

export function payAtProperty(option: Pick<RateOption, 'taxes'>): { cents: number; known: boolean } {
  if (option.taxes === null) return { cents: 0, known: false };
  return { cents: option.taxes.filter((t) => !t.included).reduce((s, t) => s + t.amountCents, 0), known: true };
}

export function toOffer(hotelId: string, kind: OfferKind, option: RateOption, nights: number, persons: number | null = null): NormalizedOffer {
  const pay = payAtProperty(option);
  const capacity = roomCapacity(option.roomName, option.maxOccupancy);
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
    roomFit: persons === null ? 'fits' : roomFit(capacity, persons),
    roomCapacity: capacity,
    roomOptions: [],
  };
}

/** Every room once with its cheapest offer: fitting rooms first, each group cheapest first. */
function roomOptionsOf(sorted: readonly RateOption[], persons: number | null): RoomOption[] {
  const byRoom = new Map<string, RoomOption>();
  for (const o of sorted) {
    const key = o.roomName.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim();
    if (byRoom.has(key)) continue;
    const capacity = roomCapacity(o.roomName, o.maxOccupancy);
    byRoom.set(key, { roomName: o.roomName, totalCents: o.totalCents, capacity, fit: persons === null ? 'fits' : roomFit(capacity, persons) });
  }
  const rooms = [...byRoom.values()];
  return [...rooms.filter((r) => r.fit === 'fits'), ...rooms.filter((r) => r.fit === 'oversized')];
}

/**
 * `persons`: the largest group in one room of the request (null: every room
 * counts, as before Aufgabe 5).
 */
export function normalizeOffers(rates: readonly HotelRates[], nights: number, persons: number | null = null): NormalizedOffer[] {
  const out: NormalizedOffer[] = [];
  for (const hotel of rates) {
    const valid = hotel.options.filter((o) => Number.isInteger(o.totalCents) && o.totalCents > 0);
    if (valid.length === 0) continue;
    const sorted = [...valid].sort((a, b) => a.totalCents - b.totalCents || a.offerId.localeCompare(b.offerId));
    const fitting = sorted.filter((o) => persons === null || roomFit(roomCapacity(o.roomName, o.maxOccupancy), persons) === 'fits');
    // Only rooms larger than needed: the cheapest one stays visible, outside the price formation.
    const candidates = fitting.length > 0 ? fitting : sorted.slice(0, 1);
    const cheapest = candidates[0] as RateOption;
    out.push({ ...toOffer(hotel.hotelId, 'cheapest', cheapest, nights, persons), roomOptions: roomOptionsOf(sorted, persons) });
    const refundable = candidates.find((o) => o.refundable);
    if (refundable && refundable.offerId !== cheapest.offerId) {
      out.push(toOffer(hotel.hotelId, 'cheapest_refundable', refundable, nights, persons));
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
