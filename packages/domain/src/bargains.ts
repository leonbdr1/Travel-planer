// Bargains (architektur.md 6.8, konzept.md 9.4): every mark carries a
// reason computed from the offers of this search; the text template is the
// only allowed savings statement (claims rule, 6.13). Since 2026-09-28 only
// the date mark (Ben): the value and place marks hit nearly every real offer.
// Since 2026-09-29 the date mark compares like with like (Ben): the same room
// (by name) with the same board and cancellation terms on the other dates. A
// double room that is free only on one date is not a bargain against the
// suite that is left on the others.
// Since 2026-09-29 evening (Ben, Aufgabe 2) the reference is the mean of the
// same room on the OTHER dates only: the old median over all dates counted
// the bargain date itself ("im Mittel 182 €" instead of (182 + 184) / 2).
import { BARGAIN_DATE_FACTOR, BARGAIN_DATE_MIN_DATES } from './constants';
import { bargainReasonDate } from './texts';

export type BargainType = 'date';

export interface BargainCandidate {
  id: string;
  hotelId: string;
  placeId: string;
  placeName: string;
  checkin: string;
  roomName: string;
  boardType: string;
  refundable: boolean;
  pricePerNightCents: number;
  nights: number;
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

/** The same kind of stay: house, room (by name, case and spacing ignored), board and cancellation terms. */
export function stayKind(o: Pick<BargainCandidate, 'hotelId' | 'roomName' | 'boardType' | 'refundable'>): string {
  const room = o.roomName.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim();
  return [o.hotelId, room, o.boardType, o.refundable ? 'refundable' : 'fixed'].join('|');
}

/** Mean price per night of the same kind of stay on the other dates (null without any). */
export function otherDatesMean(pricesByDate: ReadonlyMap<string, number>, checkin: string): number | null {
  const others = [...pricesByDate].filter(([date]) => date !== checkin).map(([, price]) => price);
  return others.length === 0 ? null : others.reduce((sum, p) => sum + p, 0) / others.length;
}

/** `F` = offers passing the filters with a quality score (6.8). */
export function detectBargains(F: readonly BargainCandidate[]): Map<string, Bargain> {
  const out = new Map<string, Bargain>();

  // Per kind of stay: one price per date (the cheapest).
  const byKind = new Map<string, Map<string, number>>();
  for (const o of F) {
    const key = stayKind(o);
    const dates = byKind.get(key) ?? new Map<string, number>();
    dates.set(o.checkin, Math.min(dates.get(o.checkin) ?? Number.POSITIVE_INFINITY, o.pricePerNightCents));
    byKind.set(key, dates);
  }
  for (const o of F) {
    const dates = byKind.get(stayKind(o));
    if (!dates || dates.size < BARGAIN_DATE_MIN_DATES) continue;
    if (dates.get(o.checkin) !== o.pricePerNightCents) continue;
    const reference = otherDatesMean(dates, o.checkin);
    if (reference === null || o.pricePerNightCents > BARGAIN_DATE_FACTOR * reference) continue;
    out.set(o.id, {
      types: ['date'],
      reason: bargainReasonDate(pct(1 - o.pricePerNightCents / reference), reference * o.nights, o.pricePerNightCents * o.nights),
    });
  }

  return out;
}
