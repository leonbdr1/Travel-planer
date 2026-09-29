// F3 demo (Aufgabe 3): start-location search by postal code and small places
// through the real endpoint GET /api/v1/geo/localities and the place search
// of step 3 (GET /api/v1/places/search).
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

const QUERIES: Array<[string, string]> = [
  ['87629', 'Füssen'],
  ['10115', 'Berlin'],
  ['50667', 'Köln'],
  ['60311', 'Frankfurt am Main'],
  ['6580', 'St Anton am Arlberg'],
  ['6991', 'Riezlern'],
  ['3920', 'Zermatt'],
  ['87538', 'Balderschwang'],
  ['Balderschw', 'Balderschwang'],
];

export async function run(out: DemoOutput): Promise<number> {
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, (line) => out.log(line)) });
  let failed = 0;
  try {
    out.log('Startort-Suche (GET /api/v1/geo/localities):');
    for (const [q, expected] of QUERIES) {
      const res = (await (await fetch(`${stack.baseUrl}/api/v1/geo/localities?q=${encodeURIComponent(q)}`)).json()) as { items: Array<{ name: string; label: string }> };
      // A postal code can cover several villages: the expected place must be among the suggestions.
      const ok = res.items.some((i) => i.name === expected);
      if (!ok) failed += 1;
      out.log(`  ${ok ? 'ok    ' : 'FEHLER'} „${q}“ → ${res.items.map((i) => i.label).join(' | ') || '(nichts)'}`);
    }
    out.log('Ortssuche in der Suche (GET /api/v1/places/search):');
    for (const q of ['Köln', 'Frankfurt', 'Berlin', '87538']) {
      const res = (await (await fetch(`${stack.baseUrl}/api/v1/places/search?q=${encodeURIComponent(q)}&origin=2825297`)).json()) as {
        catalog: Array<{ name: string }>;
        localities: Array<{ label: string }>;
      };
      const hit = res.catalog[0]?.name ?? res.localities[0]?.label ?? null;
      if (!hit) failed += 1;
      out.log(`  ${hit ? 'ok    ' : 'FEHLER'} „${q}“ → ${hit ?? '(nichts)'}`);
    }
  } finally {
    await stack.stop();
  }
  out.log(`Ergebnis: ${failed === 0 ? 'alle Abfragen ok' : `${failed} Abfragen ohne erwarteten Treffer`}`);
  return failed === 0 ? 0 : 1;
}
