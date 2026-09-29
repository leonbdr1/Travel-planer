import { describe, expect, it } from 'vitest';
import { createTripadvisorRatingSource, nameSimilarity } from '../src/rating-source/tripadvisor';
import type { FetchLike } from '../src/http/request';

const lookup = { hotelId: 'h1', name: 'Hotel Sonnenhof', city: 'Bad Reichenhall', countryCode: 'DE', lat: 47.72, lng: 12.87 };
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function source(routes: Record<string, unknown>) {
  const urls: string[] = [];
  const fetch: FetchLike = async (url) => {
    urls.push(url);
    const hit = Object.entries(routes).find(([k]) => url.includes(k));
    return hit ? json(hit[1]) : new Response('nope', { status: 404 });
  };
  return { urls, port: createTripadvisorRatingSource({ apiKey: 'k', fetch }) };
}

describe('tripadvisor rating source', () => {
  it('matches by name and position and converts 0–5 to 0–10', async () => {
    const { port, urls } = source({
      nearby_search: { data: [{ location_id: '7', name: 'Sonnenhof' }, { location_id: '8', name: 'Grand Palace' }] },
      '/location/7/details': { rating: '4.5', num_reviews: '120', web_url: 'https://ta/7', latitude: '47.7201', longitude: '12.8701' },
    });
    expect(await port.lookup(lookup)).toEqual({ status: 'ok', source: 'Tripadvisor', rating: 9, count: 120, url: 'https://ta/7' });
    expect(urls).toHaveLength(2);
    expect(port.callsPerLookup).toBe(2);
  });

  it('answers not_found without a details call when no name matches', async () => {
    const { port, urls } = source({ nearby_search: { data: [{ location_id: '8', name: 'Grand Palace' }] } });
    expect(await port.lookup(lookup)).toEqual({ status: 'unavailable', reason: 'not_found' });
    expect(urls).toHaveLength(1);
  });

  it('refuses a match that lies too far away', async () => {
    const { port } = source({
      nearby_search: { data: [{ location_id: '7', name: 'Sonnenhof' }] },
      '/location/7/details': { rating: '4.5', num_reviews: '120', latitude: '48.5', longitude: '12.87' },
    });
    expect(await port.lookup(lookup)).toEqual({ status: 'unavailable', reason: 'not_found' });
  });

  it('is not configured without a key and never retries', async () => {
    expect(createTripadvisorRatingSource({ apiKey: undefined, fetch: async () => json({}) }).configured).toBe(false);
    let calls = 0;
    const port = createTripadvisorRatingSource({ apiKey: 'k', fetch: async () => { calls += 1; return new Response('x', { status: 500 }); } });
    await expect(port.lookup(lookup)).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('ignores generic words and accents in names', () => {
    expect(nameSimilarity('Hotel Zum Löwen', 'Löwen')).toBe(1);
    expect(nameSimilarity('Hotel Sonnenhof', 'Grand Palace')).toBe(0);
  });
});
