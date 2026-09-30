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
    // Close by more regions may be shown than far away (F19).
    expect(body.regions.length).toBeLessThanOrEqual(8);
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

  it('finds a small village and a place in a country without catalog entries (F20)', async () => {
    const get = client();
    // Vimeiro, Portugal: 1,470 inhabitants, in no catalog region.
    const village = placeSearchResponseSchema.parse(await (await get('/places/search?q=Vimeiro')).json());
    const vimeiro = village.localities.find((l) => l.country_code === 'PT');
    expect(vimeiro?.label).toBe(`${vimeiro?.name}, Portugal`);
    const resolved = placeResolveResponseSchema.parse(await (await get(`/places/search?geonameid=${vimeiro?.geonameid}&origin=${MUENCHEN}`)).json());
    expect(resolved.place).toMatchObject({ kind: 'user', country_code: 'PT', verified: false });
    expect(resolved.place.minutes).toBeGreaterThan(0);
    // Obzor, Bulgaria: 2,000 inhabitants, next to the catalog region but not in it.
    const bg = placeSearchResponseSchema.parse(await (await get('/places/search?q=Obzor')).json());
    const obzor = bg.localities[0];
    expect(obzor?.label).toBe('Obzor, Bulgarien');
    const place = placeResolveResponseSchema.parse(await (await get(`/places/search?geonameid=${obzor?.geonameid}`)).json());
    expect(place.place).toMatchObject({ name: 'Obzor', kind: 'user', country_code: 'BG' });
  });
});

describe('GET /meta/config (wizard data)', () => {
  it('lists chips, themes, limits and AI labels', async () => {
    const body = metaConfigResponseSchema.parse(await (await client()('/meta/config')).json());
    expect(body.chips.map((c) => c.code)).toContain('sauber');
    expect(body.themes.find((t) => t.code === 'staedte_kultur')?.label).toBe('Kultur und Sehenswürdigkeiten');
    expect(body.limits).toMatchObject({ max_places: 10, max_dates: 12, max_combinations: 120, wish_text_max_chars: 300 });
    expect(body.ai_labels.wish_parse).toContain('KI');
    expect(body.catalog_drafts).toBe(true);
  });

  it('lists the destination countries of the catalog, South Tyrol under Italy (F20)', async () => {
    const body = metaConfigResponseSchema.parse(await (await client()('/meta/config')).json());
    const codes = body.countries.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(['ES', 'IT', 'HR', 'GR', 'PT', 'DE', 'AT']));
    expect(codes).not.toContain('IT-BZ');
    expect(body.countries.find((c) => c.code === 'ES')?.label).toBe('Spanien');
  });
});

const MUENCHEN = 2867714;

async function regionsFor(body: Record<string, unknown>) {
  const res = await client()('/suggestions/regions', { method: 'POST', body: JSON.stringify({ origin: { geonameid: MUENCHEN }, ...body }) });
  expect(res.status).toBe(200);
  return regionSuggestionsResponseSchema.parse(await res.json());
}

describe('suggestion quality grows with the distance (F19)', () => {
  it('hiking close by stays open, a beach far away shows hotspots only', async () => {
    const hiking = await regionsFor({ max_drive_minutes: 180, themes: ['wandern'] });
    expect(hiking.regions.length).toBeGreaterThanOrEqual(5);
    const beach = await regionsFor({ max_drive_minutes: 1200, themes: ['strand'] });
    expect(beach.regions.length).toBeGreaterThanOrEqual(2);
    expect(beach.regions.length).toBeLessThanOrEqual(6);
    for (const r of beach.regions) expect(r.attractiveness?.level).toBe('top');
  });

  it('flight mode: air distance, top destinations, no place within car reach', async () => {
    const body = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'] });
    expect(body.regions.length).toBeGreaterThanOrEqual(2);
    for (const r of body.regions) {
      expect(r.attractiveness?.level).toBe('top');
      expect(r.reason).toMatch(/Flug$/);
      expect(r.min_minutes).toBeGreaterThanOrEqual(60);
      expect(r.min_minutes).toBeLessThanOrEqual(480);
    }
    expect(body.travel_times).toEqual({ cached: 0, routed: 0, estimated: 0 });
  });

  it('flight mode: the flight time limit is optional and narrows the list', async () => {
    const all = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'] });
    const near = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_flight_minutes: 120, max_drive_minutes: null, themes: ['strand'] });
    for (const r of near.regions) expect(r.max_minutes).toBeLessThanOrEqual(120);
    expect(Math.max(...all.regions.map((r) => r.max_minutes))).toBeGreaterThan(120);
  });

  it('flight mode: no domestic flights', async () => {
    const body = await regionsFor({ travel_mode: 'flight', continents: [], max_drive_minutes: null, themes: ['strand', 'staedte_kultur'] });
    expect(body.regions.length).toBeGreaterThan(0);
    for (const r of body.regions) expect(r.title).not.toMatch(/Lübeck|Berlin|Hamburg|Binz/);
  });

  it('flight mode: a continent without catalog places gives no regions', async () => {
    const body = await regionsFor({ travel_mode: 'flight', continents: ['asien'], max_drive_minutes: null, themes: ['strand'] });
    expect(body.regions).toEqual([]);
  });

  it('Norway comes with nature themes, not with the beach', async () => {
    const nature = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['bergpanorama', 'natur_ruhe'] });
    expect(nature.regions.map((r) => r.name)).toContain('Fjordnorwegen');
    const beach = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'] });
    expect(beach.regions.map((r) => r.name)).not.toContain('Fjordnorwegen');
  });

  it('a named country: only that country, also places that are no top destinations (F20)', async () => {
    const open = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'] });
    const spain = await regionsFor({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'], countries: ['ES'] });
    expect(open.regions.some((r) => !/Barcelona|Palma/.test(r.title))).toBe(true);
    expect(spain.regions.length).toBeGreaterThanOrEqual(3);
    const slugs = spain.regions.map((r) => r.slug);
    expect(slugs).toEqual(expect.arrayContaining(['barcelona-costa-brava', 'mallorca']));
    for (const slug of slugs) expect(['barcelona-costa-brava', 'mallorca', 'andalusien', 'costa-blanca', 'kanaren', 'madrid', 'ibiza-menorca', 'costa-dorada', 'nordspanien']).toContain(slug);
    expect(spain.quality_filter).toBe(false);
  });

  it('a named country works by car as well and "Italien" includes South Tyrol', async () => {
    const italy = await regionsFor({ max_drive_minutes: 300, themes: ['wandern'], countries: ['IT'] });
    expect(italy.regions.length).toBeGreaterThan(0);
    expect(italy.regions.some((r) => /Südtirol|Dolomiten|Bozen|Meran|Gröden|Eisack/i.test(`${r.name} ${r.title}`))).toBe(true);
    const croatia = await regionsFor({ max_drive_minutes: 600, themes: ['strand'], countries: ['HR'] });
    expect(croatia.regions.length).toBeGreaterThan(0);
  });

  it('rejects a country code that is no code', async () => {
    const res = await client()('/suggestions/regions', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: MUENCHEN }, max_drive_minutes: 180, themes: [], countries: ['spanien'] }),
    });
    expect(res.status).toBe(400);
  });
});
