// S11.1 demo: goal and automatic pre-selection through the local stack
// (simulated LiteAPI, fake model). A search "Günstig und sauber" over three
// Allgäu places: the program sorts out with reasons, every house is
// accounted for, the review check covered the houses the goal puts first
// (all finalists checked), and run-down 4-star houses at budget prices stay
// out of the finale.
import { constants } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';
import { accountedFor, euro, finalistLine, GOAL_NAMES, getFinale, getResults, one, REASON_NAMES, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen', 'Oberstdorf', 'Sonthofen']);
    out.log('Suche: Füssen, Oberstdorf, Sonthofen × Freitage 2.–16.10., 2 Nächte, Ziel „Günstig und sauber“');
    const search = await runGoalSearch(stack, places, 'sparen');
    const finale = await getFinale(stack, search);
    out.log(`  Suche: ${search.status}; Ziel im Finale: ${GOAL_NAMES[finale.goal]} (${finale.goal}); ${finale.hotels} Unterkünfte in der Suche`);
    out.log('  Aussortiert:');
    for (const [reason, n] of Object.entries(finale.excluded) as Array<[keyof typeof finale.excluded, number]>) {
      if (n > 0) out.log(`    ${String(n).padStart(3)} ${REASON_NAMES[reason]}`);
    }
    out.log(`  Finalisten (${finale.finalists.length}, günstigste zuerst), weitere passende: ${finale.runners_up}`);
    const base = finale.finalists[0];
    for (const f of finale.finalists) if (base) out.log(`    - ${finalistLine(f, base)}`);

    const results = await getResults(stack, search, '&sort=price');
    const fourStarBudget = results.items.filter((i) => (i.hotel.stars ?? 0) >= constants.STAR_TRAP_MIN_STARS && (i.quality.score ?? 10) < constants.GOAL_QUALITY_FLOOR.sparen);
    out.log(`  Häuser mit 4 oder mehr Sternen und schwacher Bewertung in der Liste: ${fourStarBudget.length}`);
    for (const i of fourStarBudget) {
      const status = i.warnings.length > 0 ? `Warnungen: ${i.warnings.map((w) => w.label).join(', ')}` : i.review_status === 'none' ? 'nicht geprüft' : 'geprüft, ohne Warnung';
      out.log(`    ${i.hotel.name} ${'★'.repeat(Math.round(i.hotel.stars ?? 0))} · ${euro(i.best_offer.total_price_eur)} · Qualität ${i.quality.score === null ? '–' : one(i.quality.score)} · ${status}`);
    }
    const finalistIds = new Set(finale.finalists.map((f) => f.hotel.id));
    const checked = finale.finalists.filter((f) => f.review_status !== 'none').length;
    out.log(`  Rezensionen geprüft: ${checked} von ${finale.finalists.length} Finalisten (Top ${constants.REVIEW_TOP_N} nach Ziel)`);

    const ok =
      search.status === 'done' &&
      finale.goal === 'sparen' &&
      accountedFor(finale) &&
      finale.finalists.length > 0 &&
      finale.finalists.length <= constants.FINALISTS_MAX &&
      finale.excluded.too_expensive > 0 &&
      checked === finale.finalists.length &&
      fourStarBudget.every((i) => !finalistIds.has(i.hotel.id));
    out.log(ok ? '→ Ziel gilt, jede Unterkunft ist Finalist, Nachrücker oder hat einen Grund; Finalisten geprüft; Sterne-Fallen draußen' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
