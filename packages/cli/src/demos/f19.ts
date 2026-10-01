// F19 demo (Aufgabe F19): the further away, the better the suggested places;
// car or plane; continents. POST /api/v1/suggestions/regions from Munich.
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const MUENCHEN = 2867714;

interface Region {
  name: string;
  title: string;
  reason: string;
  min_minutes: number;
  max_minutes: number;
  attractiveness: { score: number; level: string; top_places: string[] } | null;
}

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) failed += 1;
    out.log(`  ${ok ? 'ok    ' : 'FEHLER'} ${text}`);
  };
  const ask = async (label: string, body: Record<string, unknown>): Promise<Region[]> => {
    const res = (await (
      await fetch(`${stack.baseUrl}/api/v1/suggestions/regions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ origin: { geonameid: MUENCHEN }, ...body }),
      })
    ).json()) as { regions: Region[] };
    out.log(`${label}: ${res.regions.length} Regionen`);
    for (const r of res.regions) {
      out.log(`    ${r.title}${r.title === r.name ? '' : ` (Region ${r.name})`} – ${r.attractiveness ? `${r.attractiveness.level} ${r.attractiveness.score}` : '?'} – ${r.reason}`);
    }
    return res.regions;
  };
  try {
    const hiking = await ask('Auto bis 3 h, Wandern', { max_drive_minutes: 180, themes: ['wandern'] });
    check(hiking.length >= 5, 'nah dran und Wandern: viele Vorschläge, auch ruhigere Gebiete');
    check(hiking.some((r) => r.attractiveness?.level !== 'top'), 'darunter Regionen, die keine Top-Ziele sind');

    const beachNear = await ask('Auto bis 3 h, Strand und Meer', { max_drive_minutes: 180, themes: ['strand'] });
    out.log(`    (${beachNear.length} Treffer)`);

    const beachFar = await ask('Auto bis 20 h, Strand und Meer', { max_drive_minutes: 1200, themes: ['strand'] });
    check(beachFar.length >= 2 && beachFar.length <= 6, 'weit weg und Strand: höchstens sechs Regionen');
    check(beachFar.every((r) => r.attractiveness?.level === 'top'), 'alle Strandregionen sind Top-Ziele');

    const flight = await ask('Flugzeug, Europa, Strand und Meer', { travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['strand'] });
    check(flight.length >= 2 && flight.length <= 6, 'Flug: höchstens sechs Regionen');
    check(flight.every((r) => r.attractiveness?.level === 'top' && /Flug$/.test(r.reason)), 'Flug: nur Top-Ziele, Flugzeit statt Fahrzeit');
    check(flight.every((r) => r.min_minutes >= 60), 'Flug: nichts, was man mit dem Auto erreicht');

    const short = await ask('Flugzeug, Europa, Strand, höchstens 2,5 h Flug', {
      travel_mode: 'flight',
      continents: ['europa'],
      max_flight_minutes: 150,
      max_drive_minutes: null,
      themes: ['strand'],
    });
    check(short.every((r) => r.max_minutes <= 150), 'Flugzeit-Grenze wirkt');

    const nature = await ask('Flugzeug, Europa, Bergpanorama und Natur', {
      travel_mode: 'flight',
      continents: ['europa'],
      max_drive_minutes: null,
      themes: ['bergpanorama', 'natur_ruhe'],
    });
    check(nature.some((r) => r.name === 'Fjordnorwegen'), 'Norwegen kommt über Bergpanorama und Natur');
    const beachOnly = flight.map((r) => r.name);
    check(!beachOnly.includes('Fjordnorwegen'), 'Norwegen kommt nicht als Strandurlaub');

    const culture = await ask('Flugzeug, Europa, Kultur und Sehenswürdigkeiten', { travel_mode: 'flight', continents: ['europa'], max_drive_minutes: null, themes: ['staedte_kultur'] });
    check(culture.length >= 2 && !culture.some((r) => /Berlin|Hamburg|München/.test(r.title)), 'Flug: keine Inlandsziele');

    const asia = await ask('Flugzeug, nur Asien', { travel_mode: 'flight', continents: ['asien'], max_drive_minutes: null, themes: ['strand'] });
    check(asia.length === 0, 'Asien: der Katalog hat dort noch keine Ziele, leere Liste');
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Prüfungen ok' : `${failed} Prüfungen fehlgeschlagen`}`);
  return failed === 0 ? 0 : 1;
}
