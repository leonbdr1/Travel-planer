// S7.3 demo: review check inside the real SearchWorkflow of the local stack
// (simulated LiteAPI, fake model). Füssen's "Hotel Schwanen" has three mould
// complaints within six months in the simulated world. First run: the skill
// confirms them and the quality score drops in stage 2. Second run with the
// daily AI budget spent: the hits stay unverified and the score is not
// reduced (status skipped_budget).
import { budgetReserve, getReviewChecks } from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';
import { productConfig } from '@reiseplaner/config';
import { hotelDetailResponseSchema, searchResultsResponseSchema } from '@reiseplaner/contracts';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack, type DemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

const HOTEL = 'Hotel Schwanen';

async function runSearch(stack: DemoStack, placeIds: string[]) {
  const request = demoSearchRequest(placeIds, { start: '2026-10-01', end: '2026-10-12' }, await altchaPayload(stack.baseUrl));
  const res = await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  const created = (await res.json()) as { search_id: string; token: string };
  const started = Date.now();
  let status = 'queued';
  while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
    status = ((await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}?token=${created.token}`)).json()) as { search: { status: string } }).search.status;
    if (['done', 'partial', 'failed'].includes(status)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const results = searchResultsResponseSchema.parse(await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}/results?token=${created.token}`)).json());
  const item = results.items.find((i) => i.hotel.name === HOTEL);
  if (!item) throw new Error(`${HOTEL} not in the results`);
  const detail = hotelDetailResponseSchema.parse(
    await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}/hotels/${item.hotel.id}?token=${created.token}`)).json(),
  );
  return { status, item, detail };
}

function show(out: DemoOutput, run: Awaited<ReturnType<typeof runSearch>>) {
  const { item, detail } = run;
  const s = detail.score;
  out.log(`  Suche: ${run.status}; Liste: review_status ${item.review_status}, ${item.warnings.length} Warnhinweis(e)`);
  out.log(`  Rezensionscheck: status ${detail.review_check?.status}, KI-gestützt ${detail.review_check?.ai_assisted}, ${detail.review_check?.reviews_checked} Bewertungen geprüft`);
  for (const w of detail.review_check?.warnings ?? []) {
    out.log(`    ${w.label}: ${w.count} Erwähnungen, davon ${w.recent_count} in den letzten 6 Monaten, zuletzt ${w.latest_date}, ${w.verified ? `bestätigt (${w.severity}, ${w.ai_provenance})` : 'ungeprüft'}`);
  }
  out.log(`  Score: Stufe 1 S0 = ${s.s0}, Aktualität ${s.recency.applied ? `Δ ${s.recency.delta} → ${s.recency.s1}` : 'nicht angewandt'}, Abzug ${s.penalty.total}, Qualität ${s.quality}`);
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen']);
    out.log(`1) Suche Füssen × 2 Freitage, KI aktiv (Fake-Modell), Top ${constants.REVIEW_TOP_N} werden geprüft:`);
    const first = await runSearch(stack, places);
    show(out, first);
    const hotelId = first.item.hotel.id;
    const [check] = await getReviewChecks(stack.db.db, [hotelId]);
    out.log(`  review_checks.topics: ${JSON.stringify(check?.topics)}`);

    out.log('');
    out.log('2) Gleiche Suche mit aufgebrauchtem KI-Tagesbudget (Check gelöscht, llm_usd voll reserviert):');
    await stack.db.db.query('DELETE FROM app.review_checks WHERE hotel_id = $1', [hotelId]);
    const cap = productConfig.limits.llm_daily_budget_usd;
    await budgetReserve(stack.db.db, 'llm_usd', cap, cap);
    const second = await runSearch(stack, places);
    show(out, second);

    const mold1 = first.detail.review_check?.warnings.find((w) => w.topic === 'schimmel');
    const mold2 = second.detail.review_check?.warnings.find((w) => w.topic === 'schimmel');
    const ok =
      mold1?.count === 3 &&
      mold1.recent_count === 3 &&
      mold1.verified &&
      first.detail.score.penalty.total > 0 &&
      second.detail.review_check?.status === 'skipped_budget' &&
      mold2?.verified === false &&
      second.detail.score.penalty.total === 0;
    out.log(ok ? '→ Schimmel 3 von 3 bestätigt, Score gemindert; ohne Budget ungeprüft und ohne Abzug' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
