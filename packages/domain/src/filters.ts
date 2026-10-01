// Offer filters (architektur.md 6.6): budget (total price), stars, rating,
// review count, property type, refundable, board and the chip filters.
import { chipDefinition } from './chips';
import { PROPERTY_KINDS, propertyKind, type PropertyKind } from './property-kind';
import type { BoardType } from './types';
import { isChipCode } from './vocabulary';

export interface FilterSettings {
  budgetTotalCents: number | null;
  minStars: number | null;
  minRating: number | null;
  minReviews: number | null;
  propertyTypes: string[];
  refundableOnly: boolean;
  board: BoardType | null;
  chips: string[];
}

export interface FilterHotel {
  stars: number | null;
  rating: number | null;
  reviewCount: number | null;
  hotelType: string | null;
  facilityIds: readonly number[];
  /** The name decides the kind when the provider's type is unknown. */
  name?: string | null;
}

export interface FilterOffer {
  totalCents: number;
  refundable: boolean;
  boardType: BoardType;
}

export const NO_FILTERS: FilterSettings = {
  budgetTotalCents: null,
  minStars: null,
  minRating: null,
  minReviews: null,
  propertyTypes: [],
  refundableOnly: false,
  board: null,
  chips: [],
};

const lower = (v: string | null) => (v ?? '').toLocaleLowerCase('de-DE');
const isKind = (v: string): v is PropertyKind => (PROPERTY_KINDS as readonly string[]).includes(v);

/** A type filter holds kinds (hotel, pension, ferienwohnung) or the provider's raw types. */
function matchesType(types: readonly string[], hotel: FilterHotel): boolean {
  const kind = propertyKind(hotel.hotelType, hotel.name);
  return types.some((t) => (isKind(t) ? t === kind : lower(t) === lower(hotel.hotelType)));
}

export function passesFilters(offer: FilterOffer, hotel: FilterHotel, f: FilterSettings): boolean {
  if (f.budgetTotalCents !== null && offer.totalCents > f.budgetTotalCents) return false;
  if (f.minStars !== null && (hotel.stars ?? 0) < f.minStars) return false;
  if (f.minRating !== null && (hotel.rating ?? -1) < f.minRating) return false;
  if (f.minReviews !== null && (hotel.reviewCount ?? 0) < f.minReviews) return false;
  if (f.propertyTypes.length > 0 && !matchesType(f.propertyTypes, hotel)) return false;
  if (f.refundableOnly && !offer.refundable) return false;
  if (f.board !== null && offer.boardType !== f.board) return false;
  for (const code of f.chips) {
    if (!isChipCode(code)) continue;
    const effect = chipDefinition(code).effect;
    if (effect.kind === 'board' && !effect.boards.includes(offer.boardType)) return false;
    if (effect.kind === 'refundable' && !offer.refundable) return false;
    if (effect.kind === 'facility') {
      const hasFacility = effect.anyOf.some((id) => hotel.facilityIds.includes(id));
      const hasType = (effect.orHotelTypes ?? []).some((t) => lower(t) === lower(hotel.hotelType));
      if (!hasFacility && !hasType) return false;
    }
  }
  return true;
}
