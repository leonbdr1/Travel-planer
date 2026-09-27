// S5.3 demo: a search with 5 places × 12 Fridays (60 combinations) runs
// through SearchWorkflow on the real local stack (simulated LiteAPI with
// latency and occasional failures); the status sequence comes from polling
// GET /searches/{id}. A second identical search is served from the rates cache.
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

interface Progress {
  search: { status: string; combos_total: number; combos_done: number; combos_failed: number };
  offers_count: number;
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen', 'Baiersbronn', 'Titisee-Neustadt', 'Bad Wildbad']);
    const runSearch = async (label: string) => {
      const res = await fetch(`${stack.baseUrl}/api/v1/searches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(demoSearchRequest(places, { start: '2026-10-01', end: '2026-12-20' }, await altchaPayload(stack.baseUrl))),
      });
      const created = (await res.json()) as { search_id: string; token: string };
      out.log(`${label}: POST /searches → HTTP ${res.status}`);
      const statuses: string[] = [];
      let last: Progress | null = null;
      const started = Date.now();
      while (Date.now() - started < 120_000) {
        const p = (await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}?token=${created.token}`)).json()) as Progress;
        last = p;
        if (statuses.at(-1) !== p.search.status) statuses.push(p.search.status);
        if (['done', 'partial', 'failed'].includes(p.search.status)) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      const s = last?.search;
      out.log(`  Statusfolge: ${statuses.join(' → ')} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
      out.log(`  Kombinationen: ${(s?.combos_done ?? 0) + (s?.combos_failed ?? 0)} von ${s?.combos_total} bearbeitet (${s?.combos_done} mit Antwort, ${s?.combos_failed} ohne Daten), Angebote: ${last?.offers_count}`);
      return last;
    };
    const usage = async () =>
      Number(
        (await stack.db.db.query<{ n: number }>("SELECT coalesce(sum(calls), 0)::int AS n FROM app.provider_usage WHERE provider = 'liteapi' AND endpoint = 'hotels/rates'"))[0]?.n ?? 0,
      );
    const first = await runSearch('Suche 1');
    const callsAfterFirst = await usage();
    out.log(`  LiteAPI-Tarifanfragen laut provider_usage: ${callsAfterFirst}`);
    const second = await runSearch('Suche 2 (identisch, innerhalb von 30 Minuten)');
    const newCalls = (await usage()) - callsAfterFirst;
    out.log(`  neue LiteAPI-Tarifanfragen: ${newCalls} (Preis-Cache)`);
    const ok =
      first?.search.combos_total === 60 &&
      first.search.combos_done + first.search.combos_failed === 60 &&
      ['done', 'partial'].includes(first.search.status) &&
      (first.offers_count ?? 0) > 0 &&
      second !== null &&
      newCalls <= (first?.search.combos_failed ?? 0) * 3;
    out.log(ok ? '→ 60 von 60 Kombinationen bearbeitet; zweite Suche aus dem Cache (nur zuvor fehlgeschlagene Kombinationen neu)' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
