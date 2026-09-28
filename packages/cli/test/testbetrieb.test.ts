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
import { checkDates, runTestbetriebChecks, testbetriebVars } from '../src/commands/testbetrieb';
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
        return new Response(JSON.stringify({ data: { id: 'lp1a2b3c', name: 'Hotel am See', hotelDescription: 'Ruhig.', hotelImages: [{ url: 'https://img/1.jpg' }], hotelFacilities: ['Sauna'] } }));
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
