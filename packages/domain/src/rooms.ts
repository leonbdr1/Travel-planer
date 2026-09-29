// Rooms mapped to the party (Aufgabe 5, docs/logik/zimmer-und-personen.md):
// how many people a room takes, whether it fits the party or is clearly more
// than needed, and the room price "Komfort" will use (prepared, not wired).
import { COMFORT_CHEAPEST_WEIGHT, ROOM_OVERSIZE_EXTRA } from './constants';

export type RoomFit = 'fits' | 'oversized';

/** One room of a house on one date: its cheapest offer, size and fit. */
export interface RoomOption {
  roomName: string;
  totalCents: number;
  capacity: number | null;
  fit: RoomFit;
}

const NAMED: Array<[RegExp, number]> = [
  [/\beinzel|\bsingle\b/i, 1],
  [/\bdoppel|\bzweibett|\bdouble\b|\btwin\b/i, 2],
  [/\bdreibett|\btriple\b/i, 3],
  [/\bvierbett|\bquadruple\b|\bfamilie|\bfamily\b/i, 4],
];

/** Guests a room takes: the provider's occupancy, else a number or a kind in its name, else unknown. */
export function roomCapacity(roomName: string, maxOccupancy: number | null): number | null {
  if (maxOccupancy !== null && Number.isInteger(maxOccupancy) && maxOccupancy > 0) return maxOccupancy;
  const counted =
    /(\d{1,2})\s*(?:personen|pers\.?|person|gäste|guests|people)\b/i.exec(roomName) ?? /(\d{1,2})\s*-?\s*bett/i.exec(roomName);
  if (counted) return Number(counted[1]);
  for (const [pattern, capacity] of NAMED) if (pattern.test(roomName)) return capacity;
  return null;
}

/** Fits up to ROOM_OVERSIZE_EXTRA places more than the party; unknown sizes fit (nothing to exclude on). */
export function roomFit(capacity: number | null, persons: number): RoomFit {
  return capacity !== null && capacity > persons + ROOM_OVERSIZE_EXTRA ? 'oversized' : 'fits';
}

const median = (values: readonly number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

/**
 * Prepared for "Komfort" (Aufgabe 5; the goal is unfinished, Aufgabe 0): the
 * other fitting rooms get weight, because a comfort traveller rarely takes
 * the plainest room. COMFORT_CHEAPEST_WEIGHT × cheapest fitting room + the
 * rest × median of all fitting rooms. Not wired into the ranking yet.
 */
export function comfortRoomPrice(rooms: readonly RoomOption[]): number | null {
  const fitting = rooms.filter((r) => r.fit === 'fits').map((r) => r.totalCents);
  if (fitting.length === 0) return null;
  return Math.round(COMFORT_CHEAPEST_WEIGHT * Math.min(...fitting) + (1 - COMFORT_CHEAPEST_WEIGHT) * median(fitting));
}
