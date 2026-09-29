// F17 demo (Aufgabe F17): a region with exactly one highlight place is named
// after that place ("Venedig" instead of "Venedig und Obere Adria"); with two
// or more highlights it keeps its name. Region suggestions through POST
// /api/v1/suggestions/regions from Munich, plus the same rule over the whole
// catalog from the database.
import { listCatalogPlaces } from '@reiseplaner/db';
import { regionTitle } from '@reiseplaner/domain';
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const MUENCHEN = 2867714;
type Regions = { regions: Array<{ name: string; title: string; highlight_place: string | null }> };

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  const regions = async (themes: string[], max: number | null) =>
    (await (
      await fetch(`${stack.baseUrl}/api/v1/suggestions/regions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ origin: { geonameid: MUENCHEN }, max_drive_minutes: max, themes }),
      })
    ).json()) as Regions;
  try {
    const seen = new Map<string, { title: string; highlight: string | null }>();
    for (const [themes, max] of [
      [['staedte_kultur'], 420],
      [['strand'], 420],
      [['wandern'], 240],
      [['shopping'], null],
    ] as const) {
      const res = await regions([...themes], max);
      out.log(`Regionen ab München, ${themes.join(', ')}, ${max === null ? 'Fahrzeit egal' : `bis ${max / 60} h`}:`);
      for (const r of res.regions) {
        seen.set(r.name, { title: r.title, highlight: r.highlight_place });
        out.log(`    ${r.title}${r.highlight_place ? `  (Region ${r.name}, einziger Top-Ort)` : ''}`);
      }
    }
    const frankfurt = seen.get('Frankfurt und Rhein-Main');
    check(frankfurt?.title === 'Frankfurt am Main', `Frankfurt und Rhein-Main heißt bei Shopping „${frankfurt?.title ?? '(nicht vorgeschlagen)'}“`);
    const slowenien = seen.get('Slowenien');
    check(!slowenien || slowenien.title === 'Slowenien', 'bei Strand heißt Slowenien nicht „Bled“ (Bled liegt nicht am Meer)');
    const allgaeu = seen.get('Allgäu');
    check(allgaeu?.title === 'Allgäu' && allgaeu.highlight === null, 'Allgäu (Oberstdorf und Füssen) behält den Regionsnamen');

    out.log('Ganzer Katalog ohne Themenwahl (gleiche Regel über alle Orte der Region):');
    const all = await listCatalogPlaces(stack.db.db, { includeDrafts: true });
    const byRegion = new Map<string, typeof all>();
    for (const p of all) if (p.regionName) byRegion.set(p.regionName, [...(byRegion.get(p.regionName) ?? []), p]);
    let named = 0;
    for (const [name, places] of [...byRegion].sort((a, b) => a[0].localeCompare(b[0], 'de'))) {
      const t = regionTitle(name, places.map((p) => ({ name: p.name, level: p.attractiveness.level })));
      if (t.highlight) {
        named += 1;
        out.log(`    ${name} → ${t.title}`);
      }
    }
    out.log(`  ${named} von ${byRegion.size} Regionen tragen den Namen ihres einzigen Top-Orts.`);
    check(regionTitle('Venedig und Obere Adria', (byRegion.get('Venedig und Obere Adria') ?? []).map((p) => ({ name: p.name, level: p.attractiveness.level }))).title === 'Venedig', 'Venedig und Obere Adria heißt „Venedig“');
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
