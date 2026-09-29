// Room categories in the price comparison: a suite is never listed next to a
// standard double room, or the higher price of the other weekend reads as
// the price of the same room. Groups are ordered by their cheapest offer.
import type { OfferDto } from '@reiseplaner/contracts';

export interface RoomGroup {
  key: string;
  name: string;
  minTotalEur: number;
  offers: OfferDto[];
}

/** Room name without case and spacing differences. */
export function roomKey(name: string): string {
  return name.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim();
}

export function groupOffersByRoom(offers: readonly OfferDto[]): RoomGroup[] {
  const groups = new Map<string, RoomGroup>();
  for (const o of offers) {
    const key = roomKey(o.room_name);
    const group = groups.get(key) ?? { key, name: o.room_name.trim(), minTotalEur: o.total_price_eur, offers: [] };
    group.offers.push(o);
    group.minTotalEur = Math.min(group.minTotalEur, o.total_price_eur);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.minTotalEur - b.minTotalEur || a.name.localeCompare(b.name, 'de'));
}
