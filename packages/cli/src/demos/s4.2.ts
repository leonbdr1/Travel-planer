// S4.2 demo over HTTP against the real local stack (Vite + workerd +
// Hyperdrive → PGlite with the development seed): autocomplete, region
// suggestions with reasons, place suggestions, and the 121st lookup → 429.
import { seedDevData } from '../seed';
import type { DemoOutput } from '../lib/output';
import { startDemoStack } from '../lib/stack';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack (PGlite mit Entwicklungsdaten + Vite + workerd) …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  const api = (path: string, init: RequestInit = {}) =>
    fetch(`${stack.baseUrl}/api/v1${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.7', ...(init.headers ?? {}) },
    });
  try {
    const loc = await api('/geo/localities?q=Stutt');
    const localities = (await loc.json()) as { items: Array<{ geonameid: number; label: string }> };
    out.log(`GET /geo/localities?q=Stutt → HTTP ${loc.status}: ${localities.items.slice(0, 3).map((i) => i.label).join(' | ')}`);
    const stuttgart = localities.items[0];
    if (!stuttgart) return 1;

    const reg = await api('/suggestions/regions', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: stuttgart.geonameid }, max_drive_minutes: 180, themes: ['wandern'] }),
    });
    const regions = (await reg.json()) as {
      regions: Array<{ id: string; name: string; reason: string }>;
      travel_times: { cached: number; routed: number; estimated: number };
    };
    out.log(`POST /suggestions/regions {Stuttgart, 180 min, wandern} → HTTP ${reg.status}`);
    for (const r of regions.regions) out.log(`  ${r.name}: ${r.reason}`);
    out.log(`  Fahrzeiten: ${JSON.stringify(regions.travel_times)}`);

    const first = regions.regions[0];
    const pl = await api('/suggestions/places', {
      method: 'POST',
      body: JSON.stringify({ origin: { geonameid: stuttgart.geonameid }, max_drive_minutes: 180, themes: ['wandern'], region_ids: [first?.id] }),
    });
    const places = (await pl.json()) as { regions: Array<{ name: string; places: Array<{ name: string; minutes: number; description: string }> }> };
    out.log(`POST /suggestions/places {${first?.name}} → HTTP ${pl.status}`);
    for (const p of places.regions[0]?.places.slice(0, 5) ?? []) out.log(`  ${p.name} (${p.minutes} min): ${p.description}`);

    let status = 0;
    let count = 3; // autocomplete, regions and places above count against the same limit
    while (status !== 429 && count < 200) {
      const res = await api('/geo/localities?q=Ulm');
      status = res.status;
      await res.body?.cancel();
      count += 1;
    }
    out.log(`Anfrage Nr. ${count} derselben Adresse innerhalb einer Stunde → HTTP ${status} (Limit 120/h)`);
    const ok = stuttgart.label.startsWith('Stuttgart') && regions.regions.length >= 2 && status === 429 && count === 121;
    out.log(ok ? '→ Stuttgart gefunden, Regionen mit Begründung, 121. Abfrage → 429' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
