// Testbetrieb setup and check (HANDOFF drift 27): the managed .dev.vars
// block, check dates, and one check run against scripted provider answers
// (success, recorded raw responses, readable errors, skipped providers).
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import { createFakeAnthropicFetch } from '@reiseplaner/providers';
import { fakeResponders } from '@reiseplaner/skills';
import { checkDates, hotelDataCheck, looksLikeKey, runTestbetriebChecks, testbetriebVars } from '../src/commands/testbetrieb';
import { withTestbetriebBlock } from '../src/lib/dev-vars';

const fixture = (name: string) => readFileSync(resolve(import.meta.dirname, '../../providers/fixtures', name), 'utf8');

describe('.dev.vars block', () => {
  const secrets = '# local\nSIGNING_KEY=s1\nIP_HASH_SALT=s2\nLITEAPI_API_KEY=old\n';

  it('adds the block once, replaces it, and removes it again', () => {
    const vars = testbetriebVars({ liteapi: 'sand_abcdefghijklmnop' });
    const once = withTestbetriebBlock(secrets, vars);
    expect(once).toContain('SIGNING_KEY=s1');
    expect(once.match(/LITEAPI_API_KEY=/g)).toHaveLength(1);
    expect(once).toContain('LLM_ENABLED=false');
    expect(once).toContain('MAIL_SOURCE=fake');
    expect(once).toContain('BOOKING_ENABLED=false');
    const twice = withTestbetriebBlock(once, testbetriebVars({ liteapi: 'sand_abcdefghijklmnop', anthropic: 'sk-ant-abcdefghijklmnop' }));
    expect(twice.match(/# >>> Testbetrieb/g)).toHaveLength(1);
    expect(twice).toContain('LLM_ENABLED=true');
    const removed = withTestbetriebBlock(twice, null);
    expect(removed).toBe('# local\nSIGNING_KEY=s1\nIP_HASH_SALT=s2\n');
  });
});

describe('key format', () => {
  it('accepts plain and base64 keys and rejects pasted junk', () => {
    expect(looksLikeKey('sand_0123456789abcdef-ghij')).toBe(true);
    expect(looksLikeKey(`ey${'A'.repeat(100)}+/x0=`)).toBe(true);
    expect(looksLikeKey('eyJvcmci OiI1YjNjZTM1=')).toBe(false);
    expect(looksLikeKey('short=')).toBe(false);
  });
});

describe('hotel data check', () => {
  const house = { id: 'lp1', name: 'Haus', address: null, city: null, countryCode: null, lat: null, lng: null, stars: null, rating: 8.4, ratingScale: 10 as const, reviewCount: null, hotelType: null, mainPhotoUrl: null, facilityIds: [] };
  const details = { ...house, description: null, photos: [], facilities: [], phone: null, email: null, checkinTime: null, checkoutTime: null, importantInformation: null };
  it('names what the rates answer and the details carry, and fails when the details lack the review count', () => {
    const [name, status, detail] = hotelDataCheck([house, { ...house, id: 'lp2', rating: null }], details);
    expect(name).toBe('LiteAPI Hoteldaten');
    expect(status).toBe('fehler');
    expect(detail).toBe(
      'Tarifantwort: Note 1/2, Anzahl Bewertungen 0/2, Koordinaten 0/2, Sterne 0/2; Details: Note 8.4, – Bewertungen, Sterne –, Koordinaten nein, 0 Ausstattungs-IDs (ohne Anzahl oder Koordinaten bleiben Häuser unbewertet)',
    );
    expect(hotelDataCheck([house], { ...details, reviewCount: 120, lat: 47.5, lng: 10.7 })[1]).toBe('ok');
  });
});

describe('check', () => {
  it('uses the first Friday at least three weeks ahead', () => {
    expect(checkDates(new Date('2026-09-28T10:00:00Z'))).toEqual({ checkin: '2026-10-23', checkout: '2026-10-25' });
  });

  it('checks every provider once, records raw answers and names errors without keys', async () => {
    const recordDir = mkdtempSync(join(tmpdir(), 'testbetrieb-'));
    const anthropic = createFakeAnthropicFetch({
      responders: fakeResponders,
      noSamplingModels: Object.entries(productConfig.ai.models).filter(([, m]) => !m.sampling_params).map(([id]) => id),
    });
    const seen: string[] = [];
    const fetch = async (url: string, init?: RequestInit) => {
      seen.push(url.replace(/\?.*$/, ''));
      if (url.includes('api.anthropic.com')) return anthropic(url, init);
      if (url.endsWith('/hotels/rates')) return new Response(fixture('liteapi/rates.json'));
      if (url.includes('/data/hotel?')) {
        return new Response(
          JSON.stringify({
            data: {
              id: 'lp1a2b3c',
              name: 'Hotel am See',
              hotelDescription: 'Ruhig.',
              hotelImages: [{ url: 'https://img/1.jpg' }],
              hotelFacilities: ['Sauna'],
              location: { latitude: 47.41, longitude: 10.28 },
              starRating: 3,
              rating: 8.6,
              reviewCount: 412,
              facilityIds: [7, 42],
            },
          }),
        );
      }
      if (url.includes('/data/reviews')) return new Response(fixture('liteapi/reviews.json'));
      if (url.endsWith('/data/facilities')) return new Response(JSON.stringify({ error: { code: 4003, message: 'facilities not available in sandbox' } }), { status: 403 });
      if (url.includes('openrouteservice')) return new Response(fixture('ors/matrix.json'));
      if (url.includes('overpass')) return Response.json({ elements: [{ type: 'node', lat: 47.5712, lon: 10.7011, tags: { highway: 'bus_stop' } }, { type: 'node', lat: 47.5704, lon: 10.7004, tags: { amenity: 'cafe' } }] });
      return new Response('{}', { status: 404 });
    };
    const checks = await runTestbetriebChecks({
      env: { LITEAPI_API_KEY: 'sand_abcdefghijklmnop', ORS_API_KEY: 'ors-abcdefghijklmnop', ANTHROPIC_API_KEY: 'sk-ant-abcdefghijklmnop' },
      now: new Date('2026-09-28T10:00:00Z'),
      fetch,
      recordDir,
    });
    const byName = Object.fromEntries(checks.map((c) => [c.name, c]));
    expect(byName['LiteAPI Tarife']).toMatchObject({ status: 'ok' });
    expect(byName['LiteAPI Tarife']?.detail).toMatch(/Füssen, 2026-10-23 bis 2026-10-25: \d+ Unterkünfte mit Angeboten/);
    expect(byName['LiteAPI Hoteldetails']).toMatchObject({ status: 'ok', detail: 'Hotel am See: 1 Fotos, Beschreibung vorhanden, 1 Ausstattungsmerkmale' });
    expect(byName['LiteAPI Hoteldaten']).toMatchObject({ status: 'ok' });
    expect(byName['LiteAPI Hoteldaten']?.detail).toMatch(/^Tarifantwort: Note \d+\/\d+, Anzahl Bewertungen \d+\/\d+, Koordinaten \d+\/\d+, Sterne \d+\/\d+; /);
    expect(byName['LiteAPI Hoteldaten']?.detail).toContain('Details: Note 8.6, 412 Bewertungen, Sterne 3, Koordinaten ja, 2 Ausstattungs-IDs');
    expect(byName['LiteAPI Rezensionen']?.status).toBe('ok');
    expect(byName['LiteAPI Ausstattungsliste']).toMatchObject({ status: 'fehler' });
    expect(byName['LiteAPI Ausstattungsliste']?.detail).toContain('HTTP 403: {"error":{"code":4003,"message":"facilities not available in sandbox"}}');
    expect(byName['Fahrzeiten']?.detail).toMatch(/^Stuttgart → Füssen: \d+ min/);
    expect(byName['Lage (OpenStreetMap)']).toMatchObject({ status: 'ok', detail: 'Füssen: 2 Punkte, bus 2 min, 1 Restaurants nah' });
    expect(byName['KI']?.status).toBe('ok');
    for (const c of checks) expect(c.detail).not.toMatch(/abcdefghijklmnop/);
    const files = readdirSync(recordDir).sort();
    expect(files.some((f) => f.includes('hotels-rates'))).toBe(true);
    expect(files.some((f) => f.includes('anthropic'))).toBe(false);
  });

  it('skips optional providers without a key', async () => {
    const checks = await runTestbetriebChecks({ env: {}, now: new Date('2026-09-28T10:00:00Z'), fetch: async () => new Response('{}') });
    expect(checks.map((c) => [c.name, c.status])).toEqual([
      ['LiteAPI Tarife', 'fehler'],
      ['Fahrzeiten', 'uebersprungen'],
      // OpenStreetMap needs no key; here the answer is no Overpass response.
      ['Lage (OpenStreetMap)', 'fehler'],
      ['KI', 'uebersprungen'],
    ]);
  });
});
