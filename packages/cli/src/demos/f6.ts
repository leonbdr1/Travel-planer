// F6 demo (Aufgabe 6): hotels, guesthouses and holiday flats judged fairly.
// Part 1: Ben's example 8.7 from 17 reviews per kind, and mould per kind.
// Part 2: a real search through the local stack; every listed house with its
// kind, guest rating, the review count from which it counts fully, and our score.
import { hasRedFlag, qualityScore, type PropertyKind } from '@reiseplaner/domain';
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

const KINDS: PropertyKind[] = ['hotel', 'pension', 'ferienwohnung'];

export async function run(out: DemoOutput): Promise<number> {
  out.log('Teil 1 – 8,7 aus 17 Bewertungen je Art:');
  for (const kind of KINDS) {
    const s = qualityScore({ rating: 8.7, reviewCount: 17, review: null, chips: [], kind });
    out.log(`  ${kind.padEnd(14)} voll ab ${s.fullWeightReviews} → Qualitätswert ${s.quality}`);
  }
  out.log('Schimmel (bestätigt, schwer) bei 9,0 aus 200 Bewertungen:');
  const mould = { recentRating: null, recentCount: 0, cleanliness: null, warnings: [{ topic: 'schimmel', severity: 'high' as const }] };
  for (const kind of KINDS) {
    const s = qualityScore({ rating: 9, reviewCount: 200, review: mould, chips: [], kind });
    const out2 = hasRedFlag({ checked: true, labels: [], warnings: [{ topic: 'schimmel', confirmed: 2, unverified: 0, guests: 2, share: 0.06 }] }, kind);
    out.log(`  ${kind.padEnd(14)} Abzug ${s.penalty.total} → ${s.quality}; 2 Gäste / 6 % Schimmel: ${out2 ? 'aussortiert' : 'Warnhinweis, bleibt'}`);
  }

  out.log('');
  out.log('Teil 2 – echte Suche über den lokalen Stack (Füssen, Oberstdorf, 01.10.–30.11.):');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  const seen: Record<string, number> = {};
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen', 'Oberstdorf']);
    const request = { ...demoSearchRequest(places, { start: '2026-10-01', end: '2026-11-30' }, await altchaPayload(stack.baseUrl)), max_drive_minutes: 240 };
    const created = (await (await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json()) as {
      search_id: string;
      token: string;
    };
    const url = (path: string) => `${stack.baseUrl}/api/v1/searches/${created.search_id}${path}${path.includes('?') ? '&' : '?'}token=${created.token}`;
    const started = Date.now();
    while (Date.now() - started < 120_000) {
      const status = ((await (await fetch(url(''))).json()) as { search: { status: string } }).search.status;
      if (['done', 'partial', 'failed'].includes(status)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const results = (await (await fetch(url('/results'))).json()) as { items: Array<{ hotel: { id: string; name: string } }> };
    for (const item of results.items) {
      const detail = (await (await fetch(url(`/hotels/${item.hotel.id}`))).json()) as {
        hotel: { hotel_type: string | null };
        score: { propertyKind: string; fullWeightReviews: number; rating: number | null; reviewCount: number; quality: number | null; penalty: { total: number } };
      };
      const s = detail.score;
      seen[s.propertyKind] = (seen[s.propertyKind] ?? 0) + 1;
      out.log(
        `  ${item.hotel.name.padEnd(28)} ${s.propertyKind.padEnd(14)} Gäste ${s.rating ?? '–'} aus ${s.reviewCount} (voll ab ${s.fullWeightReviews}) → unser Wert ${s.quality ?? '–'}${s.penalty.total > 0 ? `, Abzug ${s.penalty.total}` : ''}`,
      );
    }
  } finally {
    await stack.stop();
  }
  out.log(`Arten in der Liste: ${Object.entries(seen).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  return Object.keys(seen).length >= 2 ? 0 : 1;
}
