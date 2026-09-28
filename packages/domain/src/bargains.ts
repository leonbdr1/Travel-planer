// Bargains (architektur.md 6.8, konzept.md 9.4): every mark carries a
// reason computed from the offers of this search; the text template is the
// only allowed savings statement (claims rule, 6.13). Since 2026-09-28 only
// the date mark (Ben): the value and place marks hit nearly every real offer.
import { BARGAIN_DATE_FACTOR, BARGAIN_DATE_MIN_DATES } from './constants';
import { bargainReasonDate } from './texts';

export type BargainType = 'date';

export interface BargainCandidate {
  id: string;
  hotelId: string;
  placeId: string;
  placeName: string;
  checkin: string;
  pricePerNightCents: number;
  quality: number;
}

export interface Bargain {
  types: BargainType[];
  reason: string;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Commercial rounding to whole percent. */
const pct = (value: number) => Math.round(value * 100 + Number.EPSILON);

/** `F` = offers passing the filters with a quality score (6.8). */
export function detectBargains(F: readonly BargainCandidate[]): Map<string, Bargain> {
  const out = new Map<string, Bargain>();
  const add = (id: string, type: BargainType, reason: string) => {
    const b = out.get(id) ?? { types: [], reason: '' };
    b.types.push(type);
    b.reason = b.reason ? `${b.reason} · ${reason}` : reason;
    out.set(id, b);
  };

  // date: the same hotel on its other dates (one price per date: the cheapest).
  const byHotel = new Map<string, Map<string, number>>();
  for (const o of F) {
    const dates = byHotel.get(o.hotelId) ?? new Map<string, number>();
    dates.set(o.checkin, Math.min(dates.get(o.checkin) ?? Number.POSITIVE_INFINITY, o.pricePerNightCents));
    byHotel.set(o.hotelId, dates);
  }
  for (const o of F) {
    const dates = byHotel.get(o.hotelId);
    if (!dates || dates.size < BARGAIN_DATE_MIN_DATES) continue;
    if (dates.get(o.checkin) !== o.pricePerNightCents) continue;
    const med = median([...dates.values()]);
    if (o.pricePerNightCents <= BARGAIN_DATE_FACTOR * med) add(o.id, 'date', bargainReasonDate(pct(1 - o.pricePerNightCents / med)));
  }

  return out;
}
