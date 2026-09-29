import { createProviders, ProviderError } from '@reiseplaner/providers';
import { cliEnv } from './lib/env';
const env = cliEnv();
const p = createProviders({ mode: 'sandbox', sources: { mail: 'fake' },
  liteapi: { apiKey: env.LITEAPI_API_KEY, baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigid.org/openrouteservice' }, resend: {}, anthropic: {} });
const d = new Date(Date.now() + 33 * 864e5); const iso = (x: Date) => x.toISOString().slice(0, 10);
const out = await p.liteapi.searchRates({ lat: 47.6633, lng: 9.1753, radiusKm: 10, checkin: iso(d), checkout: iso(new Date(+d + 2 * 864e5)),
  occupancies: [{ adults: 2, childrenAges: [] }], currency: 'EUR', guestNationality: 'DE', timeoutS: 6, limit: 200 });
const opts = out.rates.flatMap((r) => r.options).slice(0, 40);
const t0 = Date.now();
for (const [i, min] of [10, 13, 16, 20, 25].entries()) {
  const wait = t0 + min * 60000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const res: string[] = [];
  for (const o of opts.slice(i * 6, i * 6 + 6)) {
    try { await p.liteapi.prebook(o.offerId); res.push('ok'); } catch (e) { res.push(e instanceof ProviderError ? `FAIL${e.status}` : 'FAIL'); }
  }
  console.log(`age ${Math.round((Date.now() - t0) / 60000)}min:`, res.join(' '));
}
