import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  localitiesResponseSchema,
  metaConfigResponseSchema,
  placeResolveResponseSchema,
  placeSearchResponseSchema,
  placeSuggestionsResponseSchema,
  regionSuggestionsResponseSchema,
} from '@reiseplaner/contracts';

let ipCounter = 0;
/** Every test uses its own client address so rate limits do not interfere. */
function client() {
  ipCounter += 1;
  const ip = `203.0.113.${ipCounter}`;
  return (path: string, init: RequestInit = {}) =>
    exports.default.fetch(`http://app.test/api/v1${path}`, {
      ...init,
      headers: { 'cf-connecting-ip': ip, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
}

const STUTTGART = 2825297;

describe('GET /geo/localities', () => {
  it('autocompletes "Stutt" to Stuttgart', async () => {
    const res = await client()('/geo/localities?q=Stutt');
    expect(res.status).toBe(200);
    const body = localitiesResponseSchema.parse(await res.json());
    expect(body.items[0]).toMatchObject({ geonameid: STUTTGART, name: 'Stuttgart', label: 'Stuttgart, Baden-Württemberg, DE' });
  });

  it('prefers German names (München, Bozen)', async () => {
    const get = client();
    const muenchen = localitiesResponseSchema.parse(await (await get('/geo/localities?q=Münch')).json());
    expect(muenchen.items[0]?.name).toBe('München');
    const bozen = localitiesResponseSchema.parse(await (await get('/geo/localities?q=Bozen')).json());
    expect(bozen.items[0]?.label).toBe('Bozen, Südtirol, IT');
  });

  it('validates the query', async () => {
    const res = await client()('/geo/localities?q=S');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'invalid_request' } });
  });

  it('answers 429 with Retry-After on the 121st lookup within an hour', async () => {
    const get = client();
    for (let i = 0; i < 120; i += 1) {
      const res = await get('/geo/localities?q=Ulm');
      expect(res.status).toBe(200);
      await res.body?.cancel();
    }
    const blocked = await get('/geo/localities?q=Ulm');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('3600');
    expect(await blocked.json()).toMatchObject({ error: { code: 'rate_limited' } });
  }, 60_000);
});

describe('POST /suggestions/regions', () => {
  it('suggests regions for Stuttgart, 180 min, wandern with reasons', async () => {
    const res = await client()('/suggestions/regions', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: STUTTGART }, max_drive_minutes: 180, themes: ['wandern'] }),
    });
    expect(res.status).toBe(200);
    const body = regionSuggestionsResponseSchema.parse(await res.json());
    expect(body.origin.label).toBe('Stuttgart');
    expect(body.regions.length).toBeGreaterThanOrEqual(2);
    expect(body.regions.length).toBeLessThanOrEqual(5);
    for (const r of body.regions) {
      expect(r.reason).toMatch(/^\d+ passende(r)? Ort(e)? für Wandern, .*Fahrt$/);
      expect(r.max_minutes).toBeLessThanOrEqual(180);
    }
    expect(body.travel_times.routed + body.travel_times.cached).toBeGreaterThan(0);
  });

  it('rejects an unknown origin', async () => {
    const res = await client()('/suggestions/regions', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: 1 }, max_drive_minutes: 180, themes: [] }),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /suggestions/places', () => {
  it('lists places of the chosen regions with drive time and description', async () => {
    const post = client();
    const regions = regionSuggestionsResponseSchema.parse(
      await (
        await post('/suggestions/regions', {
          method: 'POST',
          body: JSON.stringify({ origin: { geonameid: STUTTGART }, max_drive_minutes: 180, themes: ['wandern'] }),
        })
      ).json(),
    );
    const first = regions.regions[0];
    if (!first) throw new Error('no region');
    const res = await post('/suggestions/places', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: STUTTGART }, max_drive_minutes: 180, themes: ['wandern'], region_ids: [first.id] }),
    });
    const body = placeSuggestionsResponseSchema.parse(await res.json());
    const places = body.regions[0]?.places ?? [];
    expect(places.length).toBeGreaterThan(0);
    expect(places.length).toBeLessThanOrEqual(10);
    for (const p of places) {
      expect(p.minutes).not.toBeNull();
      expect(p.minutes ?? 0).toBeLessThanOrEqual(180);
      expect(p.description).toBeTruthy();
      expect(p.matched_themes).toContain('wandern');
    }
  });
});

describe('GET /places/search', () => {
  it('finds catalog places first and localities second, and creates user places on demand', async () => {
    const get = client();
    const search = placeSearchResponseSchema.parse(await (await get('/places/search?q=Oberstdorf')).json());
    expect(search.catalog[0]).toMatchObject({ name: 'Oberstdorf', kind: 'catalog' });
    const other = placeSearchResponseSchema.parse(await (await get('/places/search?q=Tübingen')).json());
    const tuebingen = other.localities[0];
    expect(tuebingen?.name).toBe('Tübingen');
    const resolved = placeResolveResponseSchema.parse(
      await (await get(`/places/search?geonameid=${tuebingen?.geonameid}&origin=${STUTTGART}`)).json(),
    );
    expect(resolved.place).toMatchObject({ name: 'Tübingen', kind: 'user', verified: false });
    expect(resolved.place.minutes).toBeGreaterThan(0);
    const again = placeResolveResponseSchema.parse(await (await get(`/places/search?geonameid=${tuebingen?.geonameid}`)).json());
    expect(again.place.id).toBe(resolved.place.id);
  });
});

describe('GET /meta/config (wizard data)', () => {
  it('lists chips, themes, limits and AI labels', async () => {
    const body = metaConfigResponseSchema.parse(await (await client()('/meta/config')).json());
    expect(body.chips.map((c) => c.code)).toContain('sauber');
    expect(body.themes.find((t) => t.code === 'staedte_kultur')?.label).toBe('Städte und Kultur');
    expect(body.limits).toMatchObject({ max_places: 10, max_dates: 12, max_combinations: 120, wish_text_max_chars: 300 });
    expect(body.ai_labels.wish_parse).toContain('KI');
    expect(body.catalog_drafts).toBe(true);
  });
});
