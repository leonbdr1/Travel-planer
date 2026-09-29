import { describe, expect, it } from 'vitest';
import type { OfferDto } from '@reiseplaner/contracts';
import { groupOffersByRoom } from '../src/lib/room-groups';

const offer = (id: string, room: string, total: number) => ({ id, room_name: room, total_price_eur: total }) as OfferDto;

describe('groupOffersByRoom', () => {
  it('keeps a suite apart from the double room, cheapest group first', () => {
    const groups = groupOffersByRoom([
      offer('1', 'Suite with Balcony', 577),
      offer('2', 'Double Room with Terrace', 314),
      offer('3', ' double room with  terrace ', 330),
    ]);
    expect(groups.map((g) => [g.name, g.offers.map((o) => o.id), g.minTotalEur])).toEqual([
      ['Double Room with Terrace', ['2', '3'], 314],
      ['Suite with Balcony', ['1'], 577],
    ]);
  });
});
