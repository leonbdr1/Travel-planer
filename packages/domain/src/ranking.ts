// Evaluation of a search (architektur.md 6.6–6.9): filters, quality score,
// bargains, rank score, list (every hotel once) and matrix (places × dates).
import { detectBargains, type Bargain } from './bargains';
import { RANK_BARGAIN_BONUS, RANK_UNRATED_QUALITY_NORM, RANK_W_PRICE, RANK_W_QUALITY } from './constants';
import { passesFilters, type FilterHotel, type FilterSettings } from './filters';
import type { OfferKind } from './pricing';
import { qualityScore, type ReviewSignals, type ScoreBreakdown } from './scoring';
import type { BoardType } from './types';

export interface EvalOffer {
  id: string;
  hotelId: string;
  placeId: string;
  placeName: string;
  checkin: string;
  checkout: string;
  kind: OfferKind;
  offerId: string;
  roomName: string;
  boardType: BoardType;
  refundable: boolean;
  freeCancelUntil: string | null;
  totalCents: number;
  pricePerNightCents: number;
  payAtPropertyCents: number;
  payAtPropertyKnown: boolean;
  currency: string;
}

export interface EvalHotel extends FilterHotel {
  id: string;
  name: string;
}

export interface EvaluatedOffer extends EvalOffer {
  passes: boolean;
  quality: number | null;
  breakdown: ScoreBreakdown;
  bargain: Bargain | null;
  rankScore: number;
}

export type SortKey = 'best' | 'price' | 'quality';

export function evaluateOffers(
  offers: readonly EvalOffer[],
  hotels: ReadonlyMap<string, EvalHotel>,
  filters: FilterSettings,
  reviews: ReadonlyMap<string, ReviewSignals | null> = new Map(),
): EvaluatedOffer[] {
  const scores = new Map<string, ScoreBreakdown>();
  for (const hotel of hotels.values()) {
    scores.set(
      hotel.id,
      qualityScore({ rating: hotel.rating, reviewCount: hotel.reviewCount, review: reviews.get(hotel.id) ?? null, chips: filters.chips }),
    );
  }
  const base = offers.map((o) => {
    const hotel = hotels.get(o.hotelId);
    const breakdown = scores.get(o.hotelId) ?? qualityScore({ rating: null, reviewCount: 0, review: null, chips: [] });
    return { ...o, passes: hotel ? passesFilters(o, hotel, filters) : false, quality: breakdown.quality, breakdown, bargain: null as Bargain | null, rankScore: 0 };
  });
  const F = base.filter((o) => o.passes && o.quality !== null);
  const bargains = detectBargains(F.map((o) => ({ ...o, quality: o.quality as number, nights: Math.max(1, Math.round(o.totalCents / o.pricePerNightCents)) })));
  const prices = F.map((o) => o.pricePerNightCents);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  for (const o of base) {
    o.bargain = bargains.get(o.id) ?? null;
    const qNorm = o.quality === null ? RANK_UNRATED_QUALITY_NORM : o.quality / 10;
    const pNorm = max === min ? 1 : Math.min(1, Math.max(0, 1 - (o.pricePerNightCents - min) / (max - min)));
    o.rankScore = Math.round((RANK_W_QUALITY * qNorm + RANK_W_PRICE * pNorm + (o.bargain ? RANK_BARGAIN_BONUS : 0)) * 1e6) / 1e6;
  }
  return base;
}

export function compareOffers(sort: SortKey) {
  return (a: EvaluatedOffer, b: EvaluatedOffer): number => {
    if (sort === 'price') return a.totalCents - b.totalCents || (b.quality ?? -1) - (a.quality ?? -1) || Number(b.refundable) - Number(a.refundable);
    if (sort === 'quality') return (b.quality ?? -1) - (a.quality ?? -1) || b.rankScore - a.rankScore || a.totalCents - b.totalCents;
    return b.rankScore - a.rankScore || a.totalCents - b.totalCents;
  };
}

export interface ListEntry {
  offer: EvaluatedOffer;
  otherDatesCount: number;
}

/** Every hotel exactly once with its best passing offer (6.9). */
export function hotelList(evaluated: readonly EvaluatedOffer[], sort: SortKey): ListEntry[] {
  const passing = evaluated.filter((o) => o.passes);
  const cmp = compareOffers(sort === 'price' ? 'price' : 'best');
  const best = new Map<string, EvaluatedOffer>();
  const dates = new Map<string, Set<string>>();
  for (const o of passing) {
    const current = best.get(o.hotelId);
    if (!current || cmp(o, current) < 0) best.set(o.hotelId, o);
    dates.set(o.hotelId, (dates.get(o.hotelId) ?? new Set()).add(o.checkin));
  }
  return [...best.values()]
    .sort(compareOffers(sort))
    .map((offer) => ({ offer, otherDatesCount: (dates.get(offer.hotelId)?.size ?? 1) - 1 }));
}

export type CombinationState = 'pending' | 'done' | 'cached' | 'failed';

export interface MatrixCell {
  placeId: string;
  checkin: string;
  checkout: string;
  state: 'pending' | 'offer' | 'empty' | 'failed';
  offer: EvaluatedOffer | null;
  priceBucket: number | null;
}

/**
 * Matrix: per place × date the cheapest passing offer of a house that passes
 * the goal's rules (`admissible`, see admissibleHotelIds), so a cell never
 * shows the price of a house the program sorted out; price buckets 1–5 by
 * quintile.
 */
export function buildMatrix(
  combinations: ReadonlyArray<{ placeId: string; checkin: string; checkout: string; state: CombinationState }>,
  evaluated: readonly EvaluatedOffer[],
  admissible: ReadonlySet<string> | null = null,
): MatrixCell[] {
  const bestByCell = new Map<string, EvaluatedOffer>();
  const cmp = compareOffers('price');
  for (const o of evaluated) {
    if (!o.passes || (admissible && !admissible.has(o.hotelId))) continue;
    const key = `${o.placeId}|${o.checkin}|${o.checkout}`;
    const current = bestByCell.get(key);
    if (!current || cmp(o, current) < 0) bestByCell.set(key, o);
  }
  const cells: MatrixCell[] = combinations.map((c) => {
    const offer = bestByCell.get(`${c.placeId}|${c.checkin}|${c.checkout}`) ?? null;
    const state = c.state === 'failed' ? 'failed' : c.state === 'pending' ? 'pending' : offer ? 'offer' : 'empty';
    return { placeId: c.placeId, checkin: c.checkin, checkout: c.checkout, state, offer: state === 'offer' ? offer : null, priceBucket: null };
  });
  const prices = cells.filter((c) => c.offer).map((c) => (c.offer as EvaluatedOffer).totalCents).sort((a, b) => a - b);
  for (const cell of cells) {
    if (!cell.offer) continue;
    const below = prices.filter((p) => p < (cell.offer as EvaluatedOffer).totalCents).length;
    cell.priceBucket = 1 + Math.min(4, Math.floor((5 * below) / prices.length));
  }
  return cells;
}
