// Testbetrieb (HANDOFF drift 27): single providers pinned to fake or real on
// top of PROVIDERS_MODE; real providers without a key report not_configured,
// so callers can fall back (estimate, AI off).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProviders, providerSources, type ProvidersConfig } from '../src';

const config: ProvidersConfig = {
  mode: 'sandbox',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const mail = { from: 'a@example.org', to: 'b@example.org', subject: 's', html: '<p>t</p>', text: 't' };

describe('provider sources', () => {
  it('follow PROVIDERS_MODE unless a provider is pinned', () => {
    expect(providerSources('fake')).toEqual({ liteapi: 'fake', routing: 'fake', llm: 'fake', mail: 'fake', poi: 'fake' });
    expect(providerSources('sandbox')).toEqual({ liteapi: 'real', routing: 'real', llm: 'real', mail: 'real', poi: 'real' });
    expect(providerSources('sandbox', { mail: 'fake', routing: 'fake' })).toEqual({ liteapi: 'real', routing: 'fake', llm: 'real', mail: 'fake', poi: 'real' });
  });

  it('sends real LiteAPI calls while e-mail stays simulated', async () => {
    const urls: string[] = [];
    const sample = readFileSync(resolve(import.meta.dirname, '../fixtures/liteapi/rates.json'), 'utf8');
    const providers = createProviders(
      { ...config, sources: { mail: 'fake' }, liteapi: { ...config.liteapi, apiKey: 'test-key' } },
      {
        fetch: async (url) => {
          urls.push(url);
          return new Response(sample, { headers: { 'content-type': 'application/json' } });
        },
      },
    );
    expect(providers.sources).toEqual({ liteapi: 'real', routing: 'real', llm: 'real', mail: 'fake', poi: 'real' });
    const rates = await providers.liteapi.searchRates({
      lat: 47.57,
      lng: 10.7,
      radiusKm: 5,
      checkin: '2026-10-09',
      checkout: '2026-10-11',
      occupancies: [{ adults: 2, childrenAges: [] }],
      currency: 'EUR',
      guestNationality: 'DE',
      timeoutS: 6,
      limit: 50,
    });
    expect(rates.rates.length).toBeGreaterThan(0);
    expect(urls).toEqual(['https://api.liteapi.travel/v3.0/hotels/rates']);
    expect((await providers.mail.send(mail)).providerMessageId).toBeTruthy();
    expect(urls).toHaveLength(1);
  });

  it('reports not_configured for a real provider without key', async () => {
    const providers = createProviders({ ...config, sources: { liteapi: 'fake', mail: 'fake' } });
    await expect(providers.routing.matrix({ lat: 48.78, lng: 9.18 }, [{ lat: 47.57, lng: 10.7 }])).rejects.toMatchObject({ kind: 'not_configured' });
    expect(providers.llm.configured).toBe(false);
    const fakeRates = await providers.liteapi.searchRates({
      lat: 47.57,
      lng: 10.7,
      radiusKm: 5,
      checkin: '2026-10-09',
      checkout: '2026-10-11',
      occupancies: [{ adults: 2, childrenAges: [] }],
      currency: 'EUR',
      guestNationality: 'DE',
      timeoutS: 6,
      limit: 50,
    });
    expect(fakeRates.hotels.every((h) => h.id.startsWith('lpf-'))).toBe(true);
  });
});
