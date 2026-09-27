// S2.1 demo: provider ports with fakes selected by PROVIDERS_MODE; the fake
// LiteAPI returns the simulated hotels for Oberstdorf; `--inject 429` shows
// two retries before success.
import { productConfig } from '@reiseplaner/config';
import { constants } from '@reiseplaner/domain';
import { createProviders } from '@reiseplaner/providers';
import { cliProvidersConfig } from '../lib/env';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput, args: string[]): Promise<number> {
  const i = args.indexOf('--inject');
  if (i < 0) {
    // Without arguments: normal run, then the injected-429 run as evidence.
    const normal = await runOnce(out, null);
    out.log('');
    out.log('$ npm run demo -- s2.1 --inject 429');
    return normal + (await runOnce(out, 429));
  }
  return runOnce(out, Number(args[i + 1]));
}

async function runOnce(out: DemoOutput, status: number | null): Promise<number> {
  const attempts: string[] = [];
  const providers = createProviders(cliProvidersConfig('fake'), {
    onCall: (provider, endpoint) => attempts.push(`${provider}:${endpoint}`),
    sleep: async () => {},
    ...(status ? { fake: { faults: [{ endpoint: 'hotels/rates', status, times: 2 }] } } : {}),
  });
  out.log(`PROVIDERS_MODE=${providers.mode}${status ? ` with injected HTTP ${status} (2x)` : ''}`);
  const result = await providers.liteapi.searchRates({
    lat: 47.4099,
    lng: 10.2797,
    radiusKm: constants.DEFAULT_SEARCH_RADIUS_KM,
    checkin: '2026-10-02',
    checkout: '2026-10-04',
    occupancies: [{ adults: 2, childrenAges: [] }],
    currency: productConfig.markets.currency,
    guestNationality: productConfig.markets.guest_nationality,
    timeoutS: constants.LITEAPI_RATES_TIMEOUT_S,
    limit: constants.LITEAPI_RATES_LIMIT,
  });
  out.log(`Oberstdorf 02.–04.10.2026: ${result.rates.length} hotels with offers (fixture world), ${result.rates.reduce((s, r) => s + r.options.length, 0)} offers`);
  out.log(`HTTP attempts: ${attempts.length} (${attempts.join(', ')})`);
  return 0;
}
