// `npm run cli -- ors matrix --from 48.78,9.18 --to 47.41,10.28 47.57,10.70`
import { productConfig } from '@reiseplaner/config';
import { UsageRecorder, usageSince } from '@reiseplaner/db';
import { createProviders } from '@reiseplaner/providers';
import { getTravelTimes } from '@reiseplaner/worker/services';
import { flag, flagList, parseLatLng } from '../lib/args';
import { openCliDb } from '../lib/db';
import { cliMode, cliProvidersConfig } from '../lib/env';
import { stableUuid } from '../lib/ids';

export async function orsCommand(args: string[], log: (line: string) => void): Promise<number> {
  if (args[0] !== 'matrix') {
    log('usage: ors matrix --from <lat,lng> --to <lat,lng> [<lat,lng> …] [--mode fake|sandbox]');
    return 2;
  }
  const from = parseLatLng(flag(args, 'from') ?? '');
  const to = flagList(args, 'to').map(parseLatLng);
  const mode = cliMode(args);
  const { db, via } = await openCliDb();
  try {
    const usage = new UsageRecorder();
    const { routing } = createProviders(cliProvidersConfig(mode), { onCall: (p, e) => usage.record(p, e) });
    const places = to.map((p) => ({ ...p, id: stableUuid(`cli-point:${p.lat},${p.lng}`) }));
    const day = new Date().toISOString().slice(0, 10);
    const before = (await usageSince(db, day)).filter((u) => u.provider === 'ors').reduce((s, u) => s + u.calls, 0);
    const { times, stats } = await getTravelTimes(
      { db, routing, providersMode: mode, now: new Date(), orsDailyCap: productConfig.limits.daily_quotas.ors_calls },
      from,
      places,
    );
    await usage.flush(db, day);
    const after = (await usageSince(db, day)).filter((u) => u.provider === 'ors').reduce((s, u) => s + u.calls, 0);
    log(`mode ${mode}, database ${via}`);
    places.forEach((p, i) => {
      const t = times.get(p.id)!;
      log(`to ${to[i]!.lat},${to[i]!.lng}: ${t.durationMin} min, ${t.distanceKm} km${t.estimated ? ' (geschätzt)' : ''}`);
    });
    log(`cache hits ${stats.cached}, routed ${stats.routed}, estimated ${stats.estimated}`);
    log(`new ORS requests (provider_usage): ${after - before}`);
    return 0;
  } finally {
    await db.close();
  }
}
