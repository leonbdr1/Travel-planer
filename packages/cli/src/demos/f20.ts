// F20 demo (Aufgabe F20): Europe as a whole. "Ich will nach Spanien an den
// Strand" (destination country), any place is findable and searchable even
// without a catalog entry (a village in Portugal, a resort in Bulgaria).
// Entry points: GET /meta/config, POST /suggestions/regions,
// GET /places/search, POST /searches.
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

const MUENCHEN = 2867714;

interface Region {
  slug: string;
  title: string;
  reason: string;
}

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  const api = async <T>(path: string, init?: RequestInit): Promise<T> => (await (await fetch(`${stack.baseUrl}/api/v1${path}`, init)).json()) as T;
  const regions = (body: Record<string, unknown>) =>
    api<{ regions: Region[] }>('/suggestions/regions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ origin: { geonameid: MUENCHEN }, ...body }),
    }).then((r) => r.regions);
  try {
    out.log('Reiseländer der Auswahl (GET /meta/config):');
    const meta = await api<{ countries: Array<{ code: string; label: string }> }>('/meta/config');
    out.log(`  ${meta.countries.map((c) => c.label).join(', ')}`);
    check(meta.countries.length >= 30, `${meta.countries.length} Länder, Südtirol unter Italien`);
    check(['ES', 'MT', 'BG', 'FI', 'IS'].every((c) => meta.countries.some((x) => x.code === c)), 'Spanien, Malta, Bulgarien, Finnland, Island dabei');

    out.log('Von München: Flug, Strand und Meer, Reiseland Spanien:');
    const spain = await regions({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'], countries: ['ES'] });
    for (const r of spain) out.log(`    ${r.title} (${r.slug}) – ${r.reason}`);
    const spanish = ['barcelona-costa-brava', 'mallorca', 'andalusien', 'costa-blanca', 'kanaren', 'ibiza-menorca', 'costa-dorada', 'nordspanien', 'madrid'];
    check(spain.length >= 4 && spain.every((r) => spanish.includes(r.slug)), `nur spanische Regionen, ${spain.length} Vorschläge`);

    out.log('Von München: Auto bis 20 h, Strand, Reiseland Montenegro und Albanien:');
    const balkan = await regions({ max_drive_minutes: 1200, themes: ['strand'], countries: ['ME', 'AL'] });
    for (const r of balkan) out.log(`    ${r.title} (${r.slug}) – ${r.reason}`);
    check(balkan.length >= 1 && balkan.every((r) => ['montenegro-kueste', 'albanische-riviera'].includes(r.slug)), 'nur Montenegro und Albanien');

    out.log('Flug, Strand, Reiseland Malta und Zypern:');
    const islands = await regions({ travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'], countries: ['MT', 'CY'] });
    for (const r of islands) out.log(`    ${r.title} (${r.slug}) – ${r.reason}`);
    check(islands.some((r) => r.slug === 'malta') && islands.some((r) => r.slug === 'zypern-suedkueste'), 'Malta und Zypern kommen');

    out.log('Ein kleiner Ort ohne Katalog (Tante wohnt dort): Vimeiro (Portugal, 1.470 Einwohner) und Obzor (Bulgarien, 2.000 Einwohner):');
    const ids: string[] = [];
    for (const q of ['Vimeiro', 'Obzor']) {
      const found = await api<{ localities: Array<{ geonameid: number; label: string }>; catalog: Array<{ geonameid: number | null; name: string }> }>(
        `/places/search?q=${encodeURIComponent(q)}&origin=${MUENCHEN}`,
      );
      const hit = found.localities[0] ?? found.catalog[0];
      const geonameid = hit && 'geonameid' in hit ? hit.geonameid : null;
      check(geonameid !== null, `„${q}“ gefunden: ${found.localities[0]?.label ?? found.catalog[0]?.name ?? '(nichts)'}`);
      if (geonameid === null) continue;
      const resolved = await api<{ place: { id: string; minutes: number | null } }>(`/places/search?geonameid=${geonameid}&origin=${MUENCHEN}`);
      out.log(`    → Ort angelegt, ca. ${resolved.place.minutes} min Fahrt/Luftlinie ab München`);
      ids.push(resolved.place.id);
    }
    if (ids.length === 2) {
      const res = await fetch(`${stack.baseUrl}/api/v1/searches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...demoSearchRequest(ids, { start: '2026-10-01', end: '2026-12-20' }, await altchaPayload(stack.baseUrl)),
          origin: { geonameid: MUENCHEN, label: 'München', lat: 48.13743, lng: 11.57549 },
          max_drive_minutes: 1800,
          themes: [],
        }),
      });
      const created = (await res.json()) as { search_id: string; token: string };
      check(res.status === 202 || res.status === 200, `Suche über beide Orte gestartet (HTTP ${res.status})`);
      type Progress = { search: { status: string }; offers_count: number };
      let last: Progress | null = null;
      const started = Date.now();
      while (Date.now() - started < 120_000) {
        const progress: Progress = await api(`/searches/${created.search_id}?token=${created.token}`);
        last = progress;
        if (['done', 'partial', 'failed'].includes(progress.search.status)) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      check(last !== null && ['done', 'partial'].includes(last.search.status) && last.offers_count > 0, `Suche ${last?.search.status}, ${last?.offers_count} Angebote`);
    }
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
