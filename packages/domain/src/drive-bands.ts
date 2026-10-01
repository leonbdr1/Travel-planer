// Drive times in bands (Aufgabe F16, docs/logik/fahrzeit-bloecke.md): exact
// where it matters (up to 7 h), coarse for far destinations (Spain "über
// 10 h", Portugal "über 20 h"), and from 30 h a plane as a hint only.
import {
  DRIVE_BLOCK_MIN,
  DRIVE_EXACT_MAX_MIN,
  DRIVE_FLIGHT_MIN,
  DRIVE_HOURS_MAX_MIN,
  LONG_DRIVE_ROAD_FACTOR,
  LONG_DRIVE_SPEED_KMH,
} from './constants';
import { estimateDrive, type LatLng } from './geo';

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

export type DriveBand = 'exact' | 'hours' | 'over10' | 'over20' | 'over30';

export function driveBand(minutes: number): DriveBand {
  if (minutes < DRIVE_EXACT_MAX_MIN) return 'exact';
  if (minutes < DRIVE_HOURS_MAX_MIN) return 'hours';
  if (minutes >= DRIVE_FLIGHT_MIN) return 'over30';
  return minutes >= DRIVE_BLOCK_MIN[1] ? 'over20' : 'over10';
}

/** From 30 hours by car: shown with a plane ("über 30 h"), no flight booking. */
export function isFlightDistance(minutes: number): boolean {
  return minutes >= DRIVE_FLIGHT_MIN;
}

/** "4 h 35 min", "ca. 8 h", "über 10 h", "über 20 h", "über 30 h". */
export function formatDrive(minutes: number): string {
  const band = driveBand(minutes);
  if (band === 'exact') return formatDuration(minutes);
  if (band === 'hours') return `ca. ${Math.round(minutes / 60)} h`;
  if (band === 'over30') return `über ${DRIVE_FLIGHT_MIN / 60} h`;
  return `über ${(band === 'over20' ? DRIVE_BLOCK_MIN[1] : DRIVE_BLOCK_MIN[0]) / 60} h`;
}

/** A span of drive times: exact spans as before, otherwise the band labels ("ca. 8 h bis über 10 h"). */
export function formatDriveRange(minMinutes: number, maxMinutes: number): string {
  const a = formatDrive(minMinutes);
  const b = formatDrive(maxMinutes);
  if (a === b) return a;
  return driveBand(minMinutes) === 'exact' && driveBand(maxMinutes) === 'exact' ? `${a}–${b}` : `${a} bis ${b}`;
}

/** Motorway estimate for far destinations (no routing call): distance × road factor at motorway speed. */
export function estimateLongDrive(origin: LatLng, place: LatLng): { durationMin: number; distanceKm: number } {
  return estimateDrive(origin, place, LONG_DRIVE_ROAD_FACTOR, LONG_DRIVE_SPEED_KMH);
}
