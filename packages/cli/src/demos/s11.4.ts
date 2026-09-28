// S11.4 demo: the goal as part of the search request through the local
// stack. A search with "Komfort" keeps its goal, a search without one gets
// "Preis-Leistung", an unknown goal is refused with 400; stars and rating
// minimums no longer come from the form but stay available as result filters.
import { DEFAULT_GOAL } from '@reiseplaner/domain';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { GOAL_NAMES, getFinale, getResults, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen']);
    const komfort = await runGoalSearch(stack, places, 'komfort');
    const withGoal = await getFinale(stack, komfort);
    out.log(`1) Suche mit Ziel „Komfort“: Finale-Ziel ${GOAL_NAMES[withGoal.goal]} (${withGoal.goal})`);

    const plain = await runGoalSearch(stack, places, null);
    const withoutGoal = await getFinale(stack, plain);
    out.log(`2) Suche ohne Ziel (ältere Anfrage): Finale-Ziel ${GOAL_NAMES[withoutGoal.goal]} (${withoutGoal.goal})`);

    const bad = { ...demoSearchRequest(places, { start: '2026-10-01', end: '2026-10-20' }, await altchaPayload(stack.baseUrl)), goal: 'luxus' };
    const refused = await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bad) });
    out.log(`3) Suche mit unbekanntem Ziel „luxus“: HTTP ${refused.status}`);

    const stars = await getResults(stack, plain, '&min_stars=4');
    out.log(`4) Weitere Filter im Ergebnis: Sterne ab 4 → ${stars.filters.min_stars}, ${stars.counts.hotels} Unterkünfte`);
    const filteredFinale = await getFinale(stack, plain, '&min_stars=4');
    out.log(`   Finale mit Sterne ab 4: ${filteredFinale.finalists.map((f) => `${f.hotel.name} (${f.hotel.stars ?? '–'}★)`).join(', ') || 'keine Finalisten'}`);

    const ok =
      withGoal.goal === 'komfort' &&
      withoutGoal.goal === DEFAULT_GOAL &&
      refused.status === 400 &&
      stars.filters.min_stars === 4 &&
      filteredFinale.finalists.every((f) => (f.hotel.stars ?? 0) >= 4);
    out.log(ok ? '→ Ziel wird gespeichert und gilt im Finale; ohne Ziel Preis-Leistung; unbekanntes Ziel abgelehnt; Sterne als weiterer Filter' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
