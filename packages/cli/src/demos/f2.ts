// F2 demo (Aufgabe 2): the bargain reference is the mean of the same room on
// the OTHER dates. Part 1 runs Ben's example through the domain rule; part 2
// runs a real search through the local stack and re-checks every bargain
// reason of the list against the offers of the hotel detail endpoint.
import { detectBargains, stayKind } from '@reiseplaner/domain';
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

interface Offer {
  id: string;
  hotel_id: string;
  checkin: string;
  nights: number;
  room_name: string;
  board_type: string;
  refundable: boolean;
  total_price_eur: number;
  price_per_night_eur: number;
  passes_filters: boolean;
  bargain: { reason: string } | null;
}

function benExample(out: DemoOutput): boolean {
  const base = { hotelId: 'H', placeId: 'P', placeName: 'Bad Wildbad', quality: 8, nights: 2, boardType: 'RO', refundable: true };
  const rows = [
    { id: 'k1', checkin: '2026-10-30', roomName: 'Ferienwohnung 2 „Die Kleine“', pricePerNightCents: 9_100 },
    { id: 'k2', checkin: '2026-11-06', roomName: 'Ferienwohnung 2 „Die Kleine“', pricePerNightCents: 9_204 },
    { id: 'k3', checkin: '2026-11-13', roomName: 'Ferienwohnung 2 „Die Kleine“', pricePerNightCents: 6_421 },
    { id: 'a1', checkin: '2026-10-09', roomName: 'Apartment', pricePerNightCents: 8_924 },
    { id: 'g1', checkin: '2026-10-16', roomName: 'Ferienwohnung 1 „Gartenblick“', pricePerNightCents: 9_100 },
    { id: 'g2', checkin: '2026-10-23', roomName: 'Ferienwohnung 1 „Gartenblick“', pricePerNightCents: 9_092 },
  ];
  out.log('Teil 1 – Bens Beispiel (Bad Wildbad, 2 Nächte):');
  for (const r of rows) out.log(`  ${r.checkin}  ${r.roomName.padEnd(32)} ${((r.pricePerNightCents * 2) / 100).toFixed(2)} €`);
  const bargains = detectBargains(rows.map((r) => ({ ...base, ...r })));
  for (const [id, b] of bargains) out.log(`  Schnäppchen ${id}: ${b.reason}`);
  const ok = bargains.size === 1 && (bargains.get('k3')?.reason.includes('30 % günstiger') ?? false) && (bargains.get('k3')?.reason.includes('im Mittel 183 €') ?? false);
  out.log(`  erwartet: nur k3, 30 %, im Mittel 183 € → ${ok ? 'ok' : 'FEHLER'}`);
  return ok;
}

export async function run(out: DemoOutput): Promise<number> {
  const partOne = benExample(out);
  out.log('');
  out.log('Teil 2 – echte Suche über den lokalen Stack, jede Schnäppchen-Begründung nachgerechnet:');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  let checked = 0;
  let wrong = 0;
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen', 'Baiersbronn', 'Titisee-Neustadt', 'Bad Wildbad']);
    const request = { ...demoSearchRequest(places, { start: '2026-10-01', end: '2026-11-30' }, await altchaPayload(stack.baseUrl)), max_drive_minutes: 180 };
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
      const detail = (await (await fetch(url(`/hotels/${item.hotel.id}`))).json()) as { score: { quality: number | null }; offers: Offer[] };
      const passing = detail.offers.filter((o) => o.passes_filters);
      for (const o of passing.filter((x) => x.bargain)) {
        const kind = stayKind({ hotelId: o.hotel_id, roomName: o.room_name, boardType: o.board_type, refundable: o.refundable });
        const perDate = new Map<string, number>();
        for (const x of passing) {
          if (stayKind({ hotelId: x.hotel_id, roomName: x.room_name, boardType: x.board_type, refundable: x.refundable }) !== kind) continue;
          perDate.set(x.checkin, Math.min(perDate.get(x.checkin) ?? Infinity, x.price_per_night_eur));
        }
        const others = [...perDate].filter(([d]) => d !== o.checkin).map(([, p]) => p);
        const mean = others.reduce((s, p) => s + p, 0) / others.length;
        const expected = `im Mittel ${Math.round(mean * o.nights)} € gesamt`;
        const good = o.bargain?.reason.includes(expected) ?? false;
        checked += 1;
        if (!good) wrong += 1;
        out.log(
          `  ${good ? 'ok    ' : 'FEHLER'} ${item.hotel.name} · ${o.room_name} · ${o.checkin}: andere Termine ${others.map((p) => `${Math.round(p * o.nights)} €`).join(', ')} → ${expected}`,
        );
      }
    }
  } finally {
    await stack.stop();
  }
  out.log('');
  out.log(`Ergebnis: Teil 1 ${partOne ? 'ok' : 'FEHLER'}, Teil 2 ${checked} Schnäppchen nachgerechnet, ${wrong} abweichend.`);
  return partOne && wrong === 0 && checked > 0 ? 0 : 1;
}
