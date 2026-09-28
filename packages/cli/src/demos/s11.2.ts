// S11.2 demo: praise labels through the local stack. The review check counts
// praise and criticism per topic (no AI); the list shows the labels, the
// detail the counts behind them. A house with a mould warning never shows
// "Besonders sauber".
import { constants } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';
import { getDetail, getResults, runGoalSearch } from '../lib/goal-search';
import { catalogPlaceIds } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen']);
    out.log('Suche: Füssen × Freitage 2.–16.10., Ziel „Preis-Leistung“');
    const search = await runGoalSearch(stack, places, 'ausgewogen');
    const results = await getResults(stack, search);
    const labelled = results.items.filter((i) => i.labels.length > 0);
    out.log(`  ${results.items.length} Unterkünfte in der Liste, ${labelled.length} mit Lob-Labels:`);
    for (const i of labelled) out.log(`    ${i.hotel.name}: ${i.labels.map((l) => l.label).join(' · ')}`);

    let consistent = labelled.length > 0;
    for (const i of labelled.slice(0, 3)) {
      const detail = await getDetail(stack, search, i.hotel.id);
      out.log(`  Detail ${i.hotel.name} – „Was Gäste loben“:`);
      for (const p of detail.review_check?.praise ?? []) out.log(`    ${p.label}: ${p.praised}× gelobt, ${p.criticized}× kritisiert`);
      for (const label of i.labels) {
        const p = detail.review_check?.praise.find((x) => x.topic === label.topic);
        const share = p ? p.praised / (p.praised + p.criticized) : 0;
        consistent &&= !!p && p.praised >= constants.PRAISE_MIN_MENTIONS && share >= constants.PRAISE_MIN_SHARE;
      }
    }

    const schwanen = results.items.find((i) => i.hotel.name === 'Hotel Schwanen');
    const mould = schwanen?.warnings.some((w) => w.topic === 'schimmel') ?? false;
    const cleanLabel = schwanen?.labels.some((l) => l.topic === 'sauberkeit') ?? false;
    out.log(`  Hotel Schwanen: Warnung Schimmel ${mould ? 'ja' : 'nein'}, Label „Besonders sauber“ ${cleanLabel ? 'ja' : 'nein'}, Labels: ${schwanen?.labels.map((l) => l.label).join(', ') || 'keine'}`);

    const ok = search.status === 'done' && consistent && mould && !cleanLabel;
    out.log(ok ? `→ Labels erscheinen von selbst, jedes mit mindestens ${constants.PRAISE_MIN_MENTIONS}× Lob und ${constants.PRAISE_MIN_SHARE * 100} % Anteil; keine Sauberkeit neben Schimmel` : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
