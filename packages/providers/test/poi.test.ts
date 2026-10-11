// OpenStreetMap points of interest (S11.5): query shape, tag mapping and the
// simulated Overpass API.
import { describe, expect, it } from 'vitest';
import { locationFacts } from '@reiseplaner/domain';
import { createOverpassClient, createProviders, overpassQuery, poiKind } from '../src';
import type { FetchLike } from '../src';

const house = { lat: 47.40912, lng: 10.27794 };

describe('Overpass client', () => {
  it('asks once for all houses: stops, stations, lift stations and shops in the radius, restaurants closer', () => {
    const q = overpassQuery([house, { lat: 47.5, lng: 10.3 }], 1200, 300, 20);
    expect(q.startsWith('[out:json][timeout:20];(')).toBe(true);
    expect(q).toContain('node(around:1200,47.40912,10.27794)[highway=bus_stop];');
    expect(q).toContain('node(around:1200,47.40912,10.27794)[aerialway=station];');
    expect(q).toContain('nwr(around:300,47.50000,10.30000)[amenity~"^(restaurant|cafe|pub|bar|biergarten)$"];');
    expect(q).toContain(');out center;(');
    expect(q).toContain('nwr(around:1200,47.50000,10.30000)[natural=beach];');
    expect(q.endsWith('out geom;')).toBe(true);
  });

  it('maps OSM tags to kinds', () => {
    expect(poiKind({ highway: 'bus_stop' })).toBe('bus');
    expect(poiKind({ railway: 'halt' })).toBe('bahn');
    expect(poiKind({ aerialway: 'station' })).toBe('lift');
    expect(poiKind({ shop: 'supermarket' })).toBe('supermarkt');
    expect(poiKind({ natural: 'beach' })).toBe('strand');
    expect(poiKind({ amenity: 'biergarten' })).toBe('gastro');
    expect(poiKind({ amenity: 'bank' })).toBeNull();
  });

  it('posts the query as a form with an identifying agent and reads nodes and way centres', async () => {
    let seen: { url: string; body: string; headers: Record<string, string> } | undefined;
    const fetch: FetchLike = async (url, init) => {
      seen = { url, body: String(init?.body), headers: init?.headers as Record<string, string> };
      return Response.json({
        elements: [
          { type: 'node', lat: 47.41, lon: 10.278, tags: { highway: 'bus_stop' } },
          { type: 'way', center: { lat: 47.408, lon: 10.279 }, tags: { shop: 'supermarket' } },
          { type: 'node', lat: 47.4, lon: 10.2, tags: { amenity: 'bank' } },
        ],
      });
    };
    const client = createOverpassClient({ baseUrl: 'https://overpass.test/api/interpreter', fetch, userAgent: 'reiseplaner (test)' });
    const pois = await client.around([house], 1200, 300);
    expect(pois).toEqual([
      { kind: 'bus', lat: 47.41, lng: 10.278 },
      { kind: 'supermarkt', lat: 47.408, lng: 10.279 },
    ]);
    expect(seen?.body.startsWith('data=')).toBe(true);
    expect(seen?.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(seen?.headers['user-agent']).toBe('reiseplaner (test)');
  });

  it('simulates the same points for the same house, without network', async () => {
    const providers = () =>
      createProviders({ mode: 'fake', liteapi: { baseUrl: 'x', bookBaseUrl: 'x' }, ors: { baseUrl: 'x' }, resend: {}, anthropic: {} });
    const a = await providers().poi.around([house], 1200, 300);
    const b = await providers().poi.around([house], 1200, 300);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(locationFacts(house, a).walk).toBeDefined();
  });

  it('measures a beach by its outline, not its middle (Aufgabe F20)', async () => {
    const fetch: FetchLike = async () =>
      Response.json({
        elements: [
          // A 3 km beach: the middle is far away, its western end is right at the house.
          {
            type: 'way',
            tags: { natural: 'beach' },
            center: { lat: house.lat, lon: house.lng + 0.02 },
            geometry: [
              { lat: house.lat, lon: house.lng + 0.001 },
              { lat: house.lat, lon: house.lng + 0.02 },
              { lat: house.lat, lon: house.lng + 0.04 },
            ],
          },
        ],
      });
    const client = createOverpassClient({ baseUrl: 'https://overpass.test/api/interpreter', fetch, userAgent: 'reiseplaner (test)' });
    const pois = await client.around([house], 1200, 300);
    expect(pois.every((p) => p.kind === 'strand')).toBe(true);
    expect(locationFacts(house, pois).walk.strand).toBeLessThanOrEqual(3);
  });

  it('asks for beaches with their outline', () => {
    expect(overpassQuery([house], 1200, 300, 20)).toMatch(/\[natural=beach\];\);out geom;$/);
  });
});
