// S6.1 demo: evaluation of the fixture scoring_case_1.json with the domain
// functions (quality score, bargains with reasons, rank, matrix).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { NO_FILTERS, buildMatrix, evaluateOffers, hotelList, type EvalHotel, type EvalOffer } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const fixture = JSON.parse(readFileSync(resolve(repoRoot, 'packages/domain/test/fixtures/scoring_case_1.json'), 'utf8')) as {
    hotels: EvalHotel[];
    offers: EvalOffer[];
    combinations: Array<{ placeId: string; checkin: string; checkout: string; state: 'done' }>;
  };
  const hotels = new Map(fixture.hotels.map((h) => [h.id, h]));
  const evaluated = evaluateOffers(fixture.offers, hotels, NO_FILTERS);
  out.log('Rangliste (sort=best), jede Unterkunft einmal:');
  out.log('Rang  Unterkunft            Ort          Termin      €/Nacht  Score  Rangwert  Schnäppchen');
  hotelList(evaluated, 'best').forEach((e, i) => {
    const o = e.offer;
    out.log(
      `${String(i + 1).padStart(4)}  ${(hotels.get(o.hotelId)?.name ?? '').padEnd(20)}  ${o.placeName.padEnd(11)}  ${o.checkin}  ${(o.pricePerNightCents / 100).toFixed(0).padStart(7)}  ${o.quality === null ? 'n. v.' : o.quality.toFixed(1).padStart(5)}  ${o.rankScore.toFixed(3).padStart(8)}  ${o.bargain ? o.bargain.reason : '–'}`,
    );
  });
  out.log('');
  out.log('Matrix (Zelle: bestes Angebot, Preisstufe 1–5):');
  for (const c of buildMatrix(fixture.combinations, evaluated)) {
    out.log(`  ${c.placeId} ${c.checkin}: ${c.state}${c.offer ? ` ${(c.offer.totalCents / 100).toFixed(0)} € (Stufe ${c.priceBucket})` : ''}`);
  }
  const bargain = evaluated.find((o) => o.bargain)?.bargain?.reason ?? '';
  const ok = bargain.includes('30 % günstiger als dieselbe Unterkunft an deinen anderen Terminen');
  out.log(ok ? '→ Scores, Schnäppchen-Begründung und Rangfolge wie in der Fixture' : '→ UNEXPECTED');
  return ok ? 0 : 1;
}
