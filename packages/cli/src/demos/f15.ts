// F15 demo (Aufgabe F15, Europa-Erweiterung): European start locations and
// own places through GET /api/v1/geo/localities and /api/v1/places/search,
// and European regions in the suggestions (POST /api/v1/suggestions/regions)
// from Munich.
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const MUENCHEN = 2867714;

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  const post = async <T>(path: string, body: unknown): Promise<T> =>
    (await (await fetch(`${stack.baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json()) as T;
  try {
    out.log('Startort-Suche in Europa (GET /api/v1/geo/localities):');
    for (const [q, expected] of [
      ['Venedig', 'Venedig, Italien'],
      ['Lissabon', 'Lissabon, Portugal'],
      ['Krakau', 'Krakau, Polen'],
      ['Stuttg', 'Stuttgart, Baden-Württemberg, DE'],
    ] as const) {
      const res = (await (await fetch(`${stack.baseUrl}/api/v1/geo/localities?q=${encodeURIComponent(q)}`)).json()) as { items: Array<{ label: string }> };
      check(res.items[0]?.label === expected, `„${q}“ → ${res.items.map((i) => i.label).slice(0, 3).join(' | ') || '(nichts)'}`);
    }

    out.log('Eigene Orte (GET /api/v1/places/search, Startort München):');
    for (const q of ['Venedig', 'Rovinj', 'Paris']) {
      const res = (await (await fetch(`${stack.baseUrl}/api/v1/places/search?q=${encodeURIComponent(q)}&origin=${MUENCHEN}`)).json()) as {
        catalog: Array<{ name: string; region_name: string | null; country_code: string; minutes: number | null }>;
      };
      const hit = res.catalog[0];
      check(hit?.name === q, `„${q}“ → ${hit ? `${hit.name} (${hit.region_name}, ${hit.country_code}), ${hit.minutes ?? '?'} min` : '(nichts)'}`);
    }

    type Regions = { regions: Array<{ name: string; reason: string }> };
    const lakes = await post<Regions>('/api/v1/suggestions/regions', { origin: { geonameid: MUENCHEN }, max_drive_minutes: 360, themes: ['seen'] });
    out.log('Regionen ab München, bis 6 h, Thema Seen:');
    for (const r of lakes.regions) out.log(`    ${r.name} – ${r.reason}`);
    check(lakes.regions.some((r) => r.name === 'Gardasee'), 'Gardasee ist unter den Vorschlägen');

    const beach = await post<Regions>('/api/v1/suggestions/regions', { origin: { geonameid: MUENCHEN }, max_drive_minutes: null, themes: ['strand'] });
    out.log('Regionen ab München, Fahrzeit egal, Thema Strand und Meer:');
    for (const r of beach.regions) out.log(`    ${r.name} – ${r.reason}`);
    check(beach.regions.length > 0, 'Strandregionen werden vorgeschlagen');
    check(beach.regions.some((r) => !r.name.includes('Nordsee') && !r.name.includes('Ostsee')), 'darunter Regionen außerhalb Deutschlands');
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
