// S11.5 demo: location facts from OpenStreetMap in the finale, through the
// local stack (simulated Overpass API). One search fetches walking minutes
// for the likely finalists of every goal in a single call; the same search
// again reuses the cached facts without a second call.
import { GOALS } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';
import { GOAL_NAMES, getFinale, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const overpassCalls = async () =>
      Number((await stack.db.db.query<{ n: number }>(`SELECT coalesce(sum(calls), 0)::int AS n FROM app.provider_usage WHERE provider = 'overpass'`))[0]?.n ?? 0);
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen']);
    out.log('Suche: Oberstdorf, Füssen × Freitage 2.–16.10., Ziel „Preis-Leistung“');
    const search = await runGoalSearch(stack, places, 'ausgewogen');
    const afterFirst = await overpassCalls();
    let ok = search.status === 'done' && afterFirst === 1;
    let withFacts = 0;
    let finalists = 0;
    for (const goal of GOALS) {
      const finale = await getFinale(stack, search, `&goal=${goal}`);
      out.log(`  ${GOAL_NAMES[goal]}:`);
      for (const f of finale.finalists) {
        const walk = f.features.filter((x) => x.code.startsWith('lage_')).map((x) => x.label);
        finalists += 1;
        if (walk.some((l) => / min /.test(l))) withFacts += 1;
        out.log(`    - ${f.hotel.name} (${f.offer.place_name}): ${walk.join(', ') || 'nichts in Gehweite'}`);
      }
    }
    out.log(`  Finalisten mit Gehminuten: ${withFacts} von ${finalists}; Overpass-Aufrufe nach der ersten Suche: ${afterFirst}`);
    const again = await runGoalSearch(stack, places, 'ausgewogen');
    const afterSecond = await overpassCalls();
    out.log(`  Dieselbe Suche noch einmal: Overpass-Aufrufe insgesamt ${afterSecond} (Zwischenspeicher je Unterkunft)`);
    ok &&= again.status === 'done' && afterSecond === afterFirst && withFacts > 0;
    out.log(ok ? '→ Ein Overpass-Aufruf je Suche für die Finalisten aller Ziele, Gehminuten im Vergleich, Wiederholung aus dem Zwischenspeicher' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
