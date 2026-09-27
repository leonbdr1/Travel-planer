// `npm run cli -- liteapi smoke --lat 47.41 --lng 10.28 --checkin 2026-10-02 --nights 2`
import { productConfig } from '@reiseplaner/config';
import { constants } from '@reiseplaner/domain';
import { createProviders } from '@reiseplaner/providers';
import { flag } from '../lib/args';
import { cliMode, cliProvidersConfig } from '../lib/env';

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function liteapiCommand(args: string[], log: (line: string) => void): Promise<number> {
  if (args[0] !== 'smoke') {
    log('usage: liteapi smoke --lat <lat> --lng <lng> --checkin <YYYY-MM-DD> --nights <n> [--mode fake|sandbox]');
    return 2;
  }
  const lat = Number(flag(args, 'lat'));
  const lng = Number(flag(args, 'lng'));
  const checkin = flag(args, 'checkin') ?? '';
  const nights = Number(flag(args, 'nights') ?? 2);
  const mode = cliMode(args);
  const calls: string[] = [];
  const { liteapi } = createProviders(cliProvidersConfig(mode), { onCall: (p, e) => calls.push(`${p}:${e}`) });
  const started = Date.now();
  const result = await liteapi.searchRates({
    lat,
    lng,
    radiusKm: constants.DEFAULT_SEARCH_RADIUS_KM,
    checkin,
    checkout: addDays(checkin, nights),
    occupancies: [{ adults: 2, childrenAges: [] }],
    currency: productConfig.markets.currency,
    guestNationality: productConfig.markets.guest_nationality,
    timeoutS: constants.LITEAPI_RATES_TIMEOUT_S,
    limit: constants.LITEAPI_RATES_LIMIT,
  });
  log(`mode ${mode}: ${result.rates.length} hotels with offers in ${Date.now() - started} ms (${calls.length} HTTP call(s))`);
  const first = result.rates[0];
  const info = result.hotels.find((h) => h.id === first?.hotelId);
  if (first && info) {
    const offer = [...first.options].sort((a, b) => a.totalCents - b.totalCents)[0]!;
    log(
      `example: ${info.name} (${info.stars ?? '–'}★, rating ${info.rating ?? '–'} from ${info.reviewCount ?? 0} reviews): ` +
        `${offer.roomName}, ${offer.boardType}, ${(offer.totalCents / 100).toFixed(2)} ${offer.currency} for ${nights} nights, ` +
        `${offer.refundable ? 'refundable' : 'non-refundable'}`,
    );
  }
  return 0;
}
