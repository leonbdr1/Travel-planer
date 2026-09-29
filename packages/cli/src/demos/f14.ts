// F14 demo (Aufgabe F14): culture and shopping are separate themes. Region
// suggestions through the real endpoint POST /api/v1/suggestions/regions from
// Stuttgart: "Shopping" leads to the big cities, "Kultur" to old towns and
// sights, and a place like Füssen (culture) never appears as a shopping place.
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const STUTTGART = 2825297;

interface RegionsResponse {
  regions: Array<{ name: string; reason: string }>;
}

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  try {
    const meta = (await (await fetch(`${stack.baseUrl}/api/v1/meta/config`)).json()) as { themes: Array<{ code: string; label: string }> };
    out.log(`Themen (GET /api/v1/meta/config): ${meta.themes.map((t) => t.label).join(', ')}`);
    check(meta.themes.some((t) => t.code === 'shopping' && t.label === 'Shopping und Großstadt'), 'Thema „Shopping und Großstadt“ ist wählbar');
    check(meta.themes.some((t) => t.code === 'staedte_kultur' && t.label === 'Kultur und Sehenswürdigkeiten'), 'Thema „Kultur und Sehenswürdigkeiten“ ist wählbar');

    const regions = async (themes: string[]) =>
      (await (
        await fetch(`${stack.baseUrl}/api/v1/suggestions/regions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ origin: { geonameid: STUTTGART }, max_drive_minutes: 360, themes }),
        })
      ).json()) as RegionsResponse;

    for (const themes of [['shopping'], ['staedte_kultur']]) {
      const res = await regions(themes);
      out.log(`Regionen ab Stuttgart, 6 h, Thema ${themes.join(', ')} (POST /api/v1/suggestions/regions):`);
      for (const r of res.regions) out.log(`    ${r.name} – ${r.reason}`);
      if (themes[0] === 'shopping') {
        check(res.regions.slice(0, 3).some((r) => r.name.includes('Frankfurt')), 'Frankfurt steht bei Shopping unter den ersten drei');
        check(!res.regions.some((r) => r.name === 'Allgäu'), 'Allgäu (Füssen: Kultur, kein Shopping) fehlt bei Shopping');
      } else {
        check(res.regions.some((r) => r.name.includes('Romantische Straße')), 'Franken und Romantische Straße (Altstädte) erscheint bei Kultur');
      }
    }

  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
