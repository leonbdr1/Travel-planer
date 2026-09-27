// S6.2 demo (acceptance example 1): Stuttgart, 180 min, Wandern, 01.10.–30.11.2026,
// 2 nights from Friday, 5 confirmed places → the matrix has 5 × 9 cells, each
// with price, "kein Angebot" or "keine Daten", and the list holds every hotel once.
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

interface Results {
  search: { status: string };
  matrix: { places: Array<{ id: string; name: string }>; dates: Array<{ checkin: string }>; cells: Array<{ place_id: string; checkin: string; state: string; total_price_eur: number | null; price_bucket: number | null; bargain: boolean }> };
  items: Array<{ hotel: { id: string; name: string }; best_offer: { place_name: string; checkin: string; total_price_eur: number; bargain: { reason: string } | null }; quality: { score: number | null }; other_dates_count: number }>;
  counts: { offers: number; passing: number; hotels: number; bargains: number };
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen', 'Baiersbronn', 'Titisee-Neustadt', 'Bad Wildbad']);
    const request = { ...demoSearchRequest(places, { start: '2026-10-01', end: '2026-11-30' }, await altchaPayload(stack.baseUrl)), max_drive_minutes: 180 };
    const created = (await (await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json()) as {
      search_id: string;
      token: string;
    };
    const url = (path: string) => `${stack.baseUrl}/api/v1/searches/${created.search_id}${path}${path.includes('?') ? '&' : '?'}token=${created.token}`;
    const started = Date.now();
    let status = '';
    while (Date.now() - started < 120_000) {
      status = ((await (await fetch(url(''))).json()) as { search: { status: string } }).search.status;
      if (['done', 'partial', 'failed'].includes(status)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const results = (await (await fetch(url('/results'))).json()) as Results;
    const { places: rows, dates, cells } = results.matrix;
    out.log(`Suche ${status}: Matrix ${rows.length} × ${dates.length} = ${cells.length} Zellen`);
    const euro = (v: number) => `${Math.round(v)} €`;
    out.log(`${'Ort'.padEnd(18)}${dates.map((d) => d.checkin.slice(8, 10) + '.' + d.checkin.slice(5, 7) + '.').map((d) => d.padStart(9)).join('')}`);
    for (const p of rows) {
      const line = dates
        .map((d) => {
          const c = cells.find((x) => x.place_id === p.id && x.checkin === d.checkin);
          const text = !c ? '?' : c.state === 'offer' ? `${euro(c.total_price_eur ?? 0)}${c.bargain ? '*' : ''}` : c.state === 'empty' ? 'kein Ang.' : 'k. Daten';
          return text.padStart(9);
        })
        .join('');
      out.log(`${p.name.padEnd(18)}${line}`);
    }
    out.log('(* = Schnäppchen)');
    const ids = results.items.map((i) => i.hotel.id);
    out.log(`Liste: ${results.items.length} Unterkünfte, jede genau einmal (${new Set(ids).size} eindeutig); ${results.counts.passing} von ${results.counts.offers} Angeboten erfüllen die Filter; ${results.counts.bargains} Schnäppchen`);
    for (const item of results.items.slice(0, 5)) {
      out.log(`  ${item.hotel.name} – ${item.best_offer.place_name}, ${item.best_offer.checkin}, ${euro(item.best_offer.total_price_eur)}, Score ${item.quality.score ?? 'n. v.'}, +${item.other_dates_count} weitere Termine${item.best_offer.bargain ? ` – ${item.best_offer.bargain.reason}` : ''}`);
    }
    const ok = rows.length === 5 && dates.length === 9 && cells.length === 45 && cells.every((c) => ['offer', 'empty', 'failed'].includes(c.state)) && new Set(ids).size === ids.length;
    out.log(ok ? '→ Akzeptanzbeispiel 1: Matrix 5 × 9, jede Zelle mit Preis, „kein Angebot“ oder „keine Daten“, jede Unterkunft einmal' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
