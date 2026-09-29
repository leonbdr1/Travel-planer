// F16 demo (Aufgabe F16): drive times in bands, the nearer the more exact.
// Single places through GET /api/v1/places/search?geonameid=…&origin=… and
// region suggestions through POST /api/v1/suggestions/regions, from Munich.
import { formatDrive, isFlightDistance } from '@reiseplaner/domain';
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const MUENCHEN = 2867714;
const PLACES: Array<[string, number, RegExp]> = [
  ['Venedig', 3164603, /^\d h( \d+ min)?$/],
  ['Split', 3190261, /^ca\. \d+ h$|^über 10 h$/],
  ['Barcelona', 3128760, /^über 10 h$/],
  ['Lissabon', 2267057, /^über 20 h$/],
  ['Adeje (Teneriffa)', 2522437, /^über 30 h$/],
];

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  try {
    out.log('Fahrzeit ab München je Ort (GET /api/v1/places/search?geonameid=…):');
    for (const [name, id, expected] of PLACES) {
      const res = (await (await fetch(`${stack.baseUrl}/api/v1/places/search?geonameid=${id}&origin=${MUENCHEN}`)).json()) as {
        place: { name: string; minutes: number | null; estimated: boolean };
      };
      const m = res.place.minutes;
      const shown = m === null ? '(keine)' : formatDrive(m);
      check(m !== null && expected.test(shown), `${name}: ${m ?? '?'} min → angezeigt „${shown}“${m !== null && isFlightDistance(m) ? ' mit Flugzeug „Flug empfohlen“' : ''}`);
    }

    const res = (await (
      await fetch(`${stack.baseUrl}/api/v1/suggestions/regions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ origin: { geonameid: MUENCHEN }, max_drive_minutes: null, themes: ['strand', 'wandern'] }),
      })
    ).json()) as { regions: Array<{ name: string; reason: string; min_minutes: number }>; travel_times: Record<string, number> };
    out.log(`Regionen ab München, Fahrzeit egal, Strand und Wandern (Fahrzeiten: ${JSON.stringify(res.travel_times)}):`);
    for (const r of res.regions) out.log(`    ${r.name} – ${r.reason}`);
    check(res.regions.every((r) => !/\d+ h \d+ min/.test(r.reason) || r.min_minutes < 420), 'minutengenau nur unter 7 Stunden');

    const limited = (await (
      await fetch(`${stack.baseUrl}/api/v1/suggestions/regions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ origin: { geonameid: MUENCHEN }, max_drive_minutes: 1200, themes: ['strand'] }),
      })
    ).json()) as { regions: Array<{ name: string; reason: string }> };
    out.log('Regionen ab München, bis 20 h, Strand und Meer:');
    for (const r of limited.regions) out.log(`    ${r.name} – ${r.reason}`);
    check(!limited.regions.some((r) => /Kanaren|Madeira|Algarve/.test(r.name)), 'bis 20 h: keine Kanaren, kein Madeira, keine Algarve');
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
