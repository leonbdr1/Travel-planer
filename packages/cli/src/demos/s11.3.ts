// S11.3 demo: the finale with surcharge comparison through the local stack.
// One search, three goals without a new search: per goal the finalists
// cheapest first, for every other one the surcharge and what it brings or
// lacks, and no recommendation in the answer.
import { GOALS } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';
import { accountedFor, finalistLine, GOAL_NAMES, getFinale, orderedBySurcharge, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen', 'Oberstdorf', 'Sonthofen']);
    out.log('Suche: Füssen, Oberstdorf, Sonthofen × Freitage 2.–16.10., Ziel „Günstig und sauber“; danach Zielwechsel ohne neue Suche');
    const search = await runGoalSearch(stack, places, 'sparen');
    let ok = search.status === 'done';
    let comparisons = 0;
    let unchecked = 0;
    for (const goal of GOALS) {
      const finale = await getFinale(stack, search, `&goal=${goal}`);
      const base = finale.finalists[0];
      const notChecked = finale.finalists.filter((f) => f.review_status === 'none').length;
      out.log(
        `  ${GOAL_NAMES[goal]}: ${finale.finalists.length} Finalisten (${notChecked} ohne Rezensionscheck), ${Object.values(finale.excluded).reduce((a, b) => a + b, 0)} aussortiert, davon ${finale.excluded.red_flag} mit Warnsignalen, ${finale.runners_up} weitere passende`,
      );
      for (const f of finale.finalists) if (base) out.log(`    - ${finalistLine(f, base)}`);
      comparisons += finale.finalists.slice(1).filter((f) => f.gains.length + f.losses.length > 0).length;
      unchecked += notChecked;
      const raw = (await (await fetch(`${stack.baseUrl}/api/v1/searches/${search.id}/finale?token=${search.token}&goal=${goal}`)).text()).toLowerCase();
      ok &&= finale.goal === goal && accountedFor(finale) && orderedBySurcharge(finale) && finale.finalists.length > 0 && !/recommend|empfehl|favorit/.test(raw);
    }
    out.log(`  Vergleichszeilen mit Unterschieden: ${comparisons}; Finalisten ohne Rezensionscheck über alle Ziele: ${unchecked}`);
    ok &&= comparisons > 0 && unchecked === 0;
    out.log(ok ? '→ Je Ziel: günstigste zuerst, Aufpreis = Preisdifferenz, Unterschiede benannt, alle Finalisten geprüft, keine Empfehlung' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
