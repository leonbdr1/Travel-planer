// F18 demo (Aufgabe F18): reviews in the languages of the European
// destinations. A real search through POST /api/v1/searches over eight
// European places (simulated LiteAPI, fake model); houses there get
// part of their reviews, and all complaints about an issue, in the local
// language. The review check finds and confirms them without
// translating; the complaint text of each flagged house is shown from the
// same simulated provider.
import { constants } from '@reiseplaner/domain';
import { searchResultsResponseSchema } from '@reiseplaner/contracts';
import { createFakeLiteApiFetch } from '@reiseplaner/providers';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

const PLACES = ['Rovinj', 'Split', 'Barcelona', 'Chania', 'Krakau', 'Lagos', 'Budapest', 'Stockholm'];

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  const liteapi = createFakeLiteApiFetch();
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  try {
    const placeIds = await catalogPlaceIds(stack.db.db, PLACES);
    const request = { ...demoSearchRequest(placeIds, { start: '2026-10-01', end: '2026-10-12' }, await altchaPayload(stack.baseUrl)), max_drive_minutes: null };
    const created = (await (
      await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
    ).json()) as { search_id: string; token: string };
    const started = Date.now();
    let status = 'queued';
    while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
      status = ((await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}?token=${created.token}`)).json()) as { search: { status: string } }).search.status;
      if (['done', 'partial', 'failed'].includes(status)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const results = searchResultsResponseSchema.parse(await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}/results?token=${created.token}`)).json());
    out.log(`Suche ${PLACES.join(', ')} × 2 Freitage: ${status}, ${results.items.length} Unterkünfte in der Liste`);

    // Every checked house of this search, also those the warnings took out of the list.
    const checks = await stack.db.db.query<{ hotel_id: string; name: string; topics: Array<{ topic: string; confirmed_count: number; unverified_count: number; severity: string | null }> }>(
      `SELECT c.hotel_id, h.name, c.topics FROM app.review_checks c JOIN app.hotels h ON h.id = c.hotel_id WHERE jsonb_array_length(c.topics) > 0 ORDER BY h.name`,
    );
    const languages = new Set<string>();
    for (const c of checks) {
      const reviews = (await (await liteapi(`https://api.liteapi.travel/v3.0/data/reviews?hotelId=${c.hotel_id}&limit=10`)).json()) as {
        data: Array<{ language: string; cons: string }>;
      };
      const complaint = reviews.data.find((r) => r.language !== 'de' && r.language !== 'en');
      if (!complaint) continue;
      languages.add(complaint.language);
      const inList = results.items.some((i) => i.hotel.id === c.hotel_id);
      out.log(`  ${c.name}: ${c.topics.map((t) => `${t.topic}: ${t.confirmed_count}× von der KI bestätigt${t.severity ? ` (${t.severity})` : ''}`).join(', ')}${inList ? '' : ' (aussortiert)'}`);
      out.log(`    Bewertung (${complaint.language}): „${complaint.cons}“`);
    }
    check(checks.every((c) => c.topics.every((t) => t.confirmed_count > 0)), 'alle Treffer vom Prüfschritt (Fake-Modell) bestätigt');
    check(languages.size >= 3, `Beschwerden erkannt in ${languages.size} Sprachen: ${[...languages].sort().join(', ') || '(keine)'}`);
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
