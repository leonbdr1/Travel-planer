// `npm run cli -- calibrate [--search <id>|--latest] [--out <file>]`
// Calibration report for stage 1 (S6.4): score distribution, unrated share
// and bargain rate per type for a finished search in the database. Constants
// are proposals only; changes need a decision (architektur.md is affected).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { searchRequestSchema } from '@reiseplaner/contracts';
import { getSearch, loadEvaluationData, type Queryable } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { constants, evaluateOffers, median, type EvalHotel } from '@reiseplaner/domain';
import { filtersFromRequest } from '@reiseplaner/worker/services';
import { flag } from '../lib/args';
import { openCliDb } from '../lib/db';

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo);
}

const pct = (n: number, d: number) => (d === 0 ? '–' : `${((100 * n) / d).toFixed(1)} %`);

const CORRIDOR = { min: constants.CALIBRATION_BARGAIN_RATE_MIN, max: constants.CALIBRATION_BARGAIN_RATE_MAX };

/** Only the date mark is left (Ben, 2026-09-28); value and place marks hit nearly every real offer. */
function proposal(rate: number): string {
  if (rate >= CORRIDOR.min && rate <= CORRIDOR.max) return 'im Korridor, keine Änderung vorgeschlagen.';
  const stricter = rate > CORRIDOR.max;
  const hint = stricter ? 'BARGAIN_DATE_FACTOR senken (z. B. um 0.05)' : 'BARGAIN_DATE_FACTOR erhöhen (z. B. um 0.05)';
  return `${stricter ? 'über' : 'unter'} dem Korridor; ${hint} und neu messen.`;
}

const inCorridor = (rate: number) => (rate >= CORRIDOR.min && rate <= CORRIDOR.max ? 'ja' : 'nein');

export async function calibrationReport(db: Queryable, searchId: string, sourceNote: string): Promise<{ markdown: string; rates: Record<string, number> }> {
  const search = await getSearch(db, searchId);
  if (!search) throw new Error(`search ${searchId} not found`);
  const request = searchRequestSchema.parse(search.request);
  const data = await loadEvaluationData(db, searchId);
  const hotels = new Map<string, EvalHotel>(data.hotels.map((h) => [h.id, h]));
  const evaluated = evaluateOffers(data.offers, hotels, filtersFromRequest(request));
  const F = evaluated.filter((o) => o.passes && o.quality !== null);
  const scores = [...new Set(data.hotels.map((h) => h.id))]
    .map((id) => evaluated.find((o) => o.hotelId === id)?.quality)
    .filter((q): q is number => typeof q === 'number')
    .sort((a, b) => a - b);
  const unrated = data.hotels.filter((h) => h.rating === null || (h.reviewCount ?? 0) === 0).length;
  const dateMarks = F.filter((o) => o.bargain?.types.includes('date')).length;
  const rates = { date: dateMarks / Math.max(1, F.length) };
  const lines = [
    '# Kalibrierung Stufe 1',
    '',
    `Quelle: ${sourceNote}`,
    `Suche \`${searchId}\`: ${search.combosTotal} Kombinationen, ${data.hotels.length} Unterkünfte, ${data.offers.length} Angebote, davon ${F.length} in F (Filter erfüllt, Score vorhanden).`,
    '',
    '## Qualitätsscore (Stufe 1, je Unterkunft)',
    '',
    `| Min | P10 | P25 | Median | P75 | P90 | Max | ohne Bewertungen |`,
    `|---|---|---|---|---|---|---|---|`,
    `| ${[0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((q) => quantile(scores, q).toFixed(2)).join(' | ')} | ${unrated} von ${data.hotels.length} |`,
    '',
    '## Schnäppchenquote (Anteil an F, nur Termin-Schnäppchen)',
    '',
    `| Typ | Konstante(n) | Anzahl | Quote | Zielkorridor ${pct(CORRIDOR.min, 1)} bis ${pct(CORRIDOR.max, 1)} |`,
    '|---|---|---|---|---|',
    `| date | Faktor ${constants.BARGAIN_DATE_FACTOR}, ≥ ${constants.BARGAIN_DATE_MIN_DATES} Termine | ${dateMarks} | ${pct(dateMarks, F.length)} | ${inCorridor(rates.date)} |`,
    '',
    '## Vorschläge',
    '',
    `- date: ${proposal(rates.date)}`,
    `- Unterkünfte ohne Bewertungen: ${pct(unrated, data.hotels.length)}; sie bleiben ohne Score und damit ohne Schnäppchen (6.8).`,
    '',
    '## Hinweise',
    '',
    '- Vorschläge für Konstanten werden erst nach Rückmeldung übernommen (Eskalation, `architektur.md` 6.14).',
  ];
  return { markdown: `${lines.join('\n')}\n`, rates };
}

export async function calibrateCommand(args: string[], log: (line: string) => void): Promise<number> {
  const { db, via } = await openCliDb();
  try {
    let id = flag(args, 'search');
    if (!id && args.includes('--latest')) {
      const rows = await db.query<{ id: string }>("SELECT id::text AS id FROM app.searches WHERE status IN ('done', 'partial') ORDER BY created_at DESC LIMIT 1");
      id = rows[0]?.id;
    }
    if (!id) {
      log('usage: calibrate --search <id> | --latest [--out <file>] [--source <text>]');
      return 2;
    }
    const { markdown } = await calibrationReport(db, id, flag(args, 'source') ?? `lokale Datenbank (${via})`);
    const out = flag(args, 'out');
    if (out) {
      writeFileSync(resolve(repoRoot, out), markdown);
      log(`Bericht geschrieben: ${out}`);
    }
    log(markdown);
    return 0;
  } finally {
    await db.close();
  }
}
