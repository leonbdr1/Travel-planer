// Points of interest from OpenStreetMap through the Overpass API (S11.5,
// architektur.md 6.15, ⛔ BG-20 released 2026-09-28): bus stops, railway
// stations, lift stations, supermarkets and restaurants around the likely
// finalists. One query per search for all houses; no key, fair use (the
// public instance asks for few, bounded queries and an identifying agent).
import { z } from 'zod';
import type { LatLng, Poi, PoiKind } from '@reiseplaner/domain';
import { requestJson, type FetchLike } from '../http/request';

/** The public instance (usage policy: https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances). */
export const OVERPASS_PUBLIC_URL = 'https://overpass-api.de/api/interpreter';

export interface PoiPort {
  /** Points around every house; `radiusM` for stops, lifts and shops, `gastroRadiusM` for restaurants. */
  around(houses: readonly LatLng[], radiusM: number, gastroRadiusM: number): Promise<Poi[]>;
}

const vertexSchema = z.object({ lat: z.number(), lon: z.number() });
const elementSchema = z.object({
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: vertexSchema.optional(),
  tags: z.record(z.string(), z.string()).optional(),
  /** Beaches are areas: `out geom` sends their outline (ways) or the outlines of their parts (relations). */
  geometry: z.array(vertexSchema).optional(),
  members: z.array(z.object({ geometry: z.array(vertexSchema).optional() })).optional(),
});
const overpassSchema = z.object({ elements: z.array(elementSchema) });

const GASTRO = /^(restaurant|cafe|pub|bar|biergarten)$/;

export function poiKind(tags: Readonly<Record<string, string>>): PoiKind | null {
  if (tags.aerialway === 'station') return 'lift';
  if (tags.railway === 'station' || tags.railway === 'halt') return 'bahn';
  if (tags.highway === 'bus_stop') return 'bus';
  if (tags.shop === 'supermarket') return 'supermarkt';
  if (tags.natural === 'beach') return 'strand';
  if (tags.amenity && GASTRO.test(tags.amenity)) return 'gastro';
  return null;
}

const coord = (v: number) => v.toFixed(5);

const MAX_BEACH_POINTS = 300;

/** Points along a beach: the outline vertices (thinned for very long beaches), else its middle or position. */
function beachPoints(el: z.infer<typeof elementSchema>): Array<{ lat: number; lon: number }> {
  const outline = [...(el.geometry ?? []), ...(el.members ?? []).flatMap((m) => m.geometry ?? [])];
  if (outline.length > 0) {
    const step = Math.max(1, Math.ceil(outline.length / MAX_BEACH_POINTS));
    return outline.filter((_, i) => i % step === 0);
  }
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  return lat !== undefined && lon !== undefined ? [{ lat, lon }] : [];
}

export function overpassQuery(houses: readonly LatLng[], radiusM: number, gastroRadiusM: number, timeoutS: number): string {
  const parts = houses.flatMap((h) => {
    const at = (r: number) => `(around:${Math.round(r)},${coord(h.lat)},${coord(h.lng)})`;
    return [
      `node${at(radiusM)}[highway=bus_stop];`,
      `node${at(radiusM)}[railway~"^(station|halt)$"];`,
      `node${at(radiusM)}[aerialway=station];`,
      `nwr${at(radiusM)}[shop=supermarket];`,
      `nwr${at(gastroRadiusM)}[amenity~"${GASTRO.source}"];`,
    ];
  });
  // Beaches are long areas: their middle can be far from a house at the sand's end, so the outline is asked for (F20).
  const beaches = houses.map((h) => `nwr(around:${Math.round(radiusM)},${coord(h.lat)},${coord(h.lng)})[natural=beach];`);
  return `[out:json][timeout:${timeoutS}];(${parts.join('')});out center;(${beaches.join('')});out geom;`;
}

export interface OverpassClientOptions {
  baseUrl: string;
  fetch: FetchLike;
  /** Identifies the app towards the public instance (usage policy). */
  userAgent: string;
  timeoutMs?: number;
  onCall?: (endpoint: string) => void;
}

export function createOverpassClient(options: OverpassClientOptions): PoiPort {
  const timeoutMs = options.timeoutMs ?? 20_000;
  return {
    async around(houses, radiusM, gastroRadiusM) {
      if (houses.length === 0) return [];
      const query = overpassQuery(houses, radiusM, gastroRadiusM, Math.ceil(timeoutMs / 1000));
      const raw = await requestJson({
        provider: 'overpass',
        endpoint: 'interpreter',
        url: options.baseUrl,
        schema: overpassSchema,
        fetch: options.fetch,
        headers: { 'user-agent': options.userAgent },
        bodyText: { text: `data=${encodeURIComponent(query)}`, contentType: 'application/x-www-form-urlencoded' },
        timeoutMs,
        // Busy instances answer 429/504; one more try, then the finale goes without location facts.
        maxRetries: 1,
        ...(options.onCall ? { onAttempt: options.onCall } : {}),
      });
      const pois: Poi[] = [];
      for (const el of raw.elements) {
        const kind = poiKind(el.tags ?? {});
        if (kind === 'strand') {
          for (const v of beachPoints(el)) pois.push({ kind, lat: v.lat, lng: v.lon });
          continue;
        }
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (kind && lat !== undefined && lng !== undefined) pois.push({ kind, lat, lng });
      }
      return pois;
    },
  };
}
