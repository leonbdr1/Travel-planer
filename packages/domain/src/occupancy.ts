// Rooms for the provider request: adults and children spread over the rooms,
// every room with at least one adult.
import type { Occupancy } from './types';

export function splitOccupancy(rooms: number, adults: number, childrenAges: readonly number[]): Occupancy[] | null {
  if (!Number.isInteger(rooms) || rooms < 1 || !Number.isInteger(adults) || adults < rooms) return null;
  const out: Occupancy[] = Array.from({ length: rooms }, () => ({ adults: 0, childrenAges: [] as number[] }));
  for (let i = 0; i < adults; i += 1) (out[i % rooms] as Occupancy).adults += 1;
  childrenAges.forEach((age, i) => (out[i % rooms] as Occupancy).childrenAges.push(age));
  return out;
}

/** Stable text form for cache keys: "2|8,10;2|" etc. */
export function occupancyKey(occupancies: readonly Occupancy[]): string {
  return occupancies.map((o) => `${o.adults}|${[...o.childrenAges].sort((a, b) => a - b).join(',')}`).join(';');
}
