// Frames of the orientation map (Aufgabe 13, F15): the DACH frame while every
// point fits, otherwise a coarser Europe frame. Equirectangular projection.

/** Equirectangular frame: west/east/north/south edges, reference latitude and units per degree. */
export interface Frame {
  id: 'dach' | 'europe';
  west: number;
  east: number;
  north: number;
  south: number;
  refLat: number;
  scale: number;
}
// Both frames are drawn in about 465 map units wide, so marker sizes fit both.
export const DACH: Frame = { id: 'dach', west: 5.6, east: 17.3, north: 55.2, south: 45.7, refLat: 48.5, scale: 60 };
export const EUROPE: Frame = { id: 'europe', west: -18.5, east: 32.5, north: 62, south: 27.5, refLat: 45, scale: 13 };

export function projection(f: Frame) {
  const cos = Math.cos((f.refLat * Math.PI) / 180);
  const x = (lng: number) => (lng - f.west) * cos * f.scale;
  const y = (lat: number) => (f.north - lat) * f.scale;
  const path = (points: ReadonlyArray<readonly [number, number]>) => `M${points.map(([lng, lat]) => `${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join('L')}Z`;
  return { x, y, path, width: Math.round((f.east - f.west) * cos * f.scale), height: Math.round((f.north - f.south) * f.scale) };
}

const inside = (f: Frame, p: { lat: number; lng: number }) => p.lng >= f.west && p.lng <= f.east && p.lat >= f.south && p.lat <= f.north;

/** DACH while everything fits, else Europe (exported for tests). */
export function mapFrame(points: ReadonlyArray<{ lat: number; lng: number }>): 'dach' | 'europe' {
  return points.every((p) => inside(DACH, p)) ? 'dach' : 'europe';
}
