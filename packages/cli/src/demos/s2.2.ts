// S2.2 demo (fake): the LiteAPI client normalises a rates response into the
// provider-neutral offer shape used by the domain.
import { productConfig } from '@reiseplaner/config';
import { constants } from '@reiseplaner/domain';
import { createProviders } from '@reiseplaner/providers';
import { cliProvidersConfig } from '../lib/env';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const { liteapi } = createProviders(cliProvidersConfig('fake'));
  const result = await liteapi.searchRates({
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
  const hotel = result.hotels[0]!;
  const option = result.rates.find((r) => r.hotelId === hotel.id)!.options[0]!;
  out.log('normalised hotel:');
  out.json(hotel);
  out.log('normalised offer (offerId shortened):');
  out.json({ ...option, offerId: `${option.offerId.slice(0, 24)}…` });
  return 0;
}
