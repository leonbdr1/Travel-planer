// Continents and flight time (Aufgabe F19): the flight mode of the place
// suggestions lets the traveller tick continents instead of typing a flight
// time; a flight time limit is optional. Flights are only shown, never sold.
import { FLIGHT_MIN_KM, FLIGHT_OVERHEAD_MIN, FLIGHT_SPEED_KMH } from './constants';
import type { CatalogCountry } from './countries';
import { formatDuration } from './drive-bands';
import { haversineKm, type LatLng } from './geo';

export const CONTINENT_CODES = ['europa', 'afrika', 'asien', 'nordamerika', 'suedamerika', 'ozeanien'] as const;
export type ContinentCode = (typeof CONTINENT_CODES)[number];

export const CONTINENT_LABELS: Record<ContinentCode, string> = {
  europa: 'Europa',
  afrika: 'Afrika',
  asien: 'Asien',
  nordamerika: 'Nordamerika',
  suedamerika: 'Südamerika',
  ozeanien: 'Ozeanien',
};

/** Continent of every catalog country; the catalog is European so far (islands like the Canaries count with their country). */
const CONTINENT_OF_COUNTRY: Record<CatalogCountry, ContinentCode> = {
  DE: 'europa', AT: 'europa', CH: 'europa', 'IT-BZ': 'europa', IT: 'europa', FR: 'europa', ES: 'europa', PT: 'europa', NL: 'europa',
  BE: 'europa', LU: 'europa', DK: 'europa', CZ: 'europa', PL: 'europa', HU: 'europa', HR: 'europa', SI: 'europa', SK: 'europa',
  GR: 'europa', GB: 'europa', IE: 'europa', NO: 'europa', SE: 'europa',
  AL: 'europa', AD: 'europa', BA: 'europa', BG: 'europa', CY: 'europa', EE: 'europa', FI: 'europa', IS: 'europa', LV: 'europa', LI: 'europa', LT: 'europa', MT: 'europa', MC: 'europa', ME: 'europa', MK: 'europa', RO: 'europa', RS: 'europa', TR: 'europa',
};

export function continentOf(countryKey: string): ContinentCode | null {
  return (CONTINENT_OF_COUNTRY as Record<string, ContinentCode | undefined>)[countryKey] ?? null;
}

export function isContinentCode(code: string): code is ContinentCode {
  return (CONTINENT_CODES as readonly string[]).includes(code);
}

/** Flight time in minutes for the air distance, rounded to five minutes. */
export function estimateFlightMinutes(origin: LatLng, place: LatLng): number {
  const minutes = FLIGHT_OVERHEAD_MIN + (haversineKm(origin, place) / FLIGHT_SPEED_KMH) * 60;
  return Math.round(minutes / 5) * 5;
}

/** A destination this far away is a flight trip (not a car trip with a plane hint). */
export function isFlightDistanceKm(km: number): boolean {
  return km >= FLIGHT_MIN_KM;
}

/** "2 h 30 min" or "2 h bis 3 h 30 min": flight times are estimates, so a span is shown as such. */
export function formatFlightRange(minMinutes: number, maxMinutes: number): string {
  const a = formatDuration(minMinutes);
  const b = formatDuration(maxMinutes);
  return a === b ? a : `${a} bis ${b}`;
}
