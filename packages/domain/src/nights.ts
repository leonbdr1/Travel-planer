// Flexible nights (Aufgabe 4, docs/logik/flexible-naechte.md): what one more
// night of the same stay costs, compared with the nights before. Same house,
// room, board, cancellation terms and arrival; only the nights differ.
import { EXTRA_NIGHT_CHEAP_RATIO, EXTRA_NIGHT_EXPENSIVE_RATIO } from './constants';
import { stayKind } from './bargains';

export interface NightOffer {
  id: string;
  hotelId: string;
  roomName: string;
  boardType: string;
  refundable: boolean;
  checkin: string;
  nights: number;
  totalCents: number;
}

export type ExtraNightVerdict = 'cheap' | 'normal' | 'expensive';

export interface ExtraNight {
  fromNights: number;
  toNights: number;
  /** Offer of the longer stay. */
  longerOfferId: string;
  /** Total(n + 1) − total(n). */
  extraCents: number;
  /** Total(n) / n. */
  nightlyCents: number;
  verdict: ExtraNightVerdict;
}

export function extraNightVerdict(extraCents: number, nightlyCents: number): ExtraNightVerdict {
  if (extraCents <= EXTRA_NIGHT_CHEAP_RATIO * nightlyCents) return 'cheap';
  if (extraCents >= EXTRA_NIGHT_EXPENSIVE_RATIO * nightlyCents) return 'expensive';
  return 'normal';
}

/**
 * Per offer id: the comparison with one night more. The cheapest offer of a
 * kind and length stands for it; the shorter stay carries the step to the
 * next length, the longest stay the step from the length before.
 */
export function extraNights(offers: readonly NightOffer[]): Map<string, ExtraNight> {
  const byStay = new Map<string, Map<number, NightOffer>>();
  for (const o of offers) {
    // Same stay apart from its length: the kind without the nights, plus the arrival.
    const key = `${stayKind({ hotelId: o.hotelId, roomName: o.roomName, boardType: o.boardType, refundable: o.refundable })}|${o.checkin}`;
    const lengths = byStay.get(key) ?? new Map<number, NightOffer>();
    const current = lengths.get(o.nights);
    if (!current || o.totalCents < current.totalCents) lengths.set(o.nights, o);
    byStay.set(key, lengths);
  }
  const out = new Map<string, ExtraNight>();
  for (const lengths of byStay.values()) {
    const sorted = [...lengths.values()].sort((a, b) => a.nights - b.nights);
    for (let i = 0; i + 1 < sorted.length; i += 1) {
      const short = sorted[i] as NightOffer;
      const long = sorted[i + 1] as NightOffer;
      if (long.nights !== short.nights + 1) continue;
      const nightlyCents = Math.round(short.totalCents / short.nights);
      const extraCents = long.totalCents - short.totalCents;
      const step: ExtraNight = {
        fromNights: short.nights,
        toNights: long.nights,
        longerOfferId: long.id,
        extraCents,
        nightlyCents,
        verdict: extraNightVerdict(extraCents, nightlyCents),
      };
      out.set(short.id, step);
      if (!out.has(long.id)) out.set(long.id, step);
    }
  }
  return out;
}
