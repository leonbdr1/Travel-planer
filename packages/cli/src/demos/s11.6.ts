// S11.6 demo: the decisions of 2026-09-28 through the local stack. Prints the
// values in force, then one search over five places for all three goals:
// at most five finalists, at most one house without reviews (marked, never
// for "Komfort"), weaker houses only when clearly cheaper and never for
// "Komfort", no red flag in any finale, and praise labels relative to the
// review volume.
import { constants, GOALS } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';
import { accountedFor, euro, GOAL_NAMES, getDetail, getFinale, one, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

const pct = (v: number) => `${Math.round(v * 100)} %`;

export async function run(out: DemoOutput): Promise<number> {
  const c = constants;
  out.log('Beschlossene Werte (28.09.2026):');
  out.log(`  Mindestnote ${GOALS.map((g) => `${GOAL_NAMES[g]} ${one(c.GOAL_QUALITY_FLOOR[g])}`).join(', ')}`);
  out.log(`  Ausnahme: ab ${one(c.LOW_QUALITY_EXCEPTION_MIN)}, geprüft, höchstens ${pct(c.LOW_QUALITY_EXCEPTION_PRICE_RATIO)} des günstigsten Hauses mit normaler Note, nicht bei Komfort`);
  out.log(`  Warnsignale (bestätigt/ungeprüft): ${Object.entries(c.RED_FLAG_MIN_MENTIONS).map(([t, m]) => `${t} ${m.confirmed}/${m.unverified}`).join(', ')}`);
  out.log(`  Ohne Bewertungen: höchstens ${c.UNRATED_FINALISTS_MAX} im Finale, raus unter ${pct(c.UNRATED_MIN_PRICE_RATIO)} des Mittelpreises oder billiger mit mehr Extras als ${pct(1 - c.UNRATED_MAX_EXTRAS_SHARE)} der bewerteten Häuser`);
  out.log(`  Lob-Label: mindestens ${c.PRAISE_MIN_MENTIONS} Gäste und ${pct(c.PRAISE_MIN_REVIEW_SHARE)} der Bewertungen, ${pct(c.PRAISE_MIN_SHARE)} Lob-Anteil, letzte ${c.PRAISE_RECENT_MONTHS} Monate zählen ${c.PRAISE_RECENT_WEIGHT}-fach`);
  out.log(`  Finale: höchstens ${c.FINALISTS_MAX} Unterkünfte`);
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen', 'Oberstdorf', 'Sonthofen', 'Pfronten', 'Oberstaufen']);
    out.log(`Suche: ${places.length} Orte × Freitage 2.–16.10., Ziel „Günstig und sauber“`);
    const search = await runGoalSearch(stack, places, 'sparen');
    let ok = search.status === 'done';
    for (const goal of GOALS) {
      const finale = await getFinale(stack, search, `&goal=${goal}`);
      const floor = c.GOAL_QUALITY_FLOOR[goal];
      const unrated = finale.finalists.filter((f) => f.quality.score === null);
      const weaker = finale.finalists.filter((f) => f.quality.score !== null && f.quality.score < floor);
      const flagged = finale.finalists.filter((f) =>
        f.warnings.some((w) => {
          const min = (c.RED_FLAG_MIN_MENTIONS as Record<string, { confirmed: number; unverified: number } | undefined>)[w.topic];
          return min !== undefined && (w.verified ? w.count >= min.confirmed : w.count >= min.unverified);
        }),
      );
      out.log(
        `  ${GOAL_NAMES[goal]}: ${finale.finalists.length} Finalisten (${finale.finalists.map((f) => `${f.hotel.name} ${f.quality.score === null ? 'ohne Bewertungen' : one(f.quality.score)} ${euro(f.offer.total_price_eur)}`).join('; ')})`,
      );
      out.log(`    ohne Bewertungen im Finale: ${unrated.length}; unter der Mindestnote (Ausnahme): ${weaker.length}; mit Warnsignal: ${flagged.length}; aussortiert ohne Bewertungen: ${finale.excluded.no_reviews}`);
      ok &&=
        accountedFor(finale) &&
        finale.finalists.length <= c.FINALISTS_MAX &&
        unrated.length <= c.UNRATED_FINALISTS_MAX &&
        flagged.length === 0 &&
        (goal !== 'komfort' || (unrated.length === 0 && weaker.length === 0)) &&
        weaker.every((f) => (f.quality.score ?? 0) >= c.LOW_QUALITY_EXCEPTION_MIN);
    }
    // Praise labels relative to the volume: every label clears the review share.
    const finale = await getFinale(stack, search, '&goal=komfort');
    let labels = 0;
    for (const f of finale.finalists.slice(0, 3)) {
      const detail = await getDetail(stack, search, f.hotel.id);
      const check = detail.review_check;
      if (!check) continue;
      for (const l of check.labels) {
        const count = check.praise.find((p) => p.topic === l.topic);
        labels += 1;
        out.log(`  Label „${l.label}“ bei ${f.hotel.name}: ${count?.praised ?? 0}× gelobt, ${count?.criticized ?? 0}× kritisiert, ${check.reviews_checked} Bewertungen geprüft`);
        ok &&= (count?.praised ?? 0) >= c.PRAISE_MIN_MENTIONS;
      }
    }
    ok &&= labels > 0;
    out.log(ok ? '→ Höchstens fünf Finalisten, höchstens eines ohne Bewertungen, schwächere nur deutlich günstiger und nie bei Komfort, keine Warnsignale, Labels nach Anteil' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
