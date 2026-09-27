// Bargains (architektur.md 6.8, konzept.md 9.4): every mark carries a
// reason computed from the offers of this search. The three text templates
// are the only allowed savings statements (claims rule, 6.13).
import {
  BARGAIN_DATE_FACTOR,
  BARGAIN_DATE_MIN_DATES,
  BARGAIN_PLACE_FACTOR,
  BARGAIN_PLACE_MAX_QUALITY_GAP,
  BARGAIN_PLACE_MIN_OFFERS,
  BARGAIN_VALUE_FACTOR,
  BARGAIN_VALUE_MIN_OFFERS,
  BARGAIN_VALUE_MIN_QUALITY,
} from './constants';
import { bargainReasonDate, bargainReasonPlace, bargainReasonValue } from './texts';

export type BargainType = 'value' | 'date' | 'place';

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

  // value: quality per euro per night against the median of the search.
  if (F.length >= BARGAIN_VALUE_MIN_OFFERS) {
    const values = F.map((o) => o.quality / (o.pricePerNightCents / 100));
    const med = median(values);
    F.forEach((o, i) => {
      const v = values[i] as number;
      if (med > 0 && v >= BARGAIN_VALUE_FACTOR * med && o.quality >= BARGAIN_VALUE_MIN_QUALITY) {
        add(o.id, 'value', bargainReasonValue(pct(v / med - 1)));
      }
    });
  }

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

  // place: comparable offers in the same place on the same date.
  for (const o of F) {
    const peers = F.filter(
      (x) => x.placeId === o.placeId && x.checkin === o.checkin && Math.abs(x.quality - o.quality) <= BARGAIN_PLACE_MAX_QUALITY_GAP,
    );
    if (peers.length < BARGAIN_PLACE_MIN_OFFERS) continue;
    const med = median(peers.map((x) => x.pricePerNightCents));
    if (o.pricePerNightCents <= BARGAIN_PLACE_FACTOR * med) add(o.id, 'place', bargainReasonPlace(pct(1 - o.pricePerNightCents / med), o.placeName));
  }
  return out;
}
