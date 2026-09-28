// Searches with a goal through the HTTP API of the local stack, and the
// finale, list and detail of such a search (M11 demos).
import { finaleResponseSchema, hotelDetailResponseSchema, searchResultsResponseSchema, type FinaleResponse, type FinalistDto } from '@reiseplaner/contracts';
import { constants, type Goal } from '@reiseplaner/domain';
import { altchaPayload } from './altcha';
import { demoSearchRequest } from './search-request';
import type { DemoStack } from './stack';

export interface GoalSearch {
  id: string;
  token: string;
  status: string;
}

/** Starts a search (without `goal`: the request carries none) and waits until it is final. */
export async function runGoalSearch(
  stack: DemoStack,
  placeIds: string[],
  goal: Goal | null,
  window = { start: '2026-10-01', end: '2026-10-20' },
): Promise<GoalSearch> {
  const request = { ...demoSearchRequest(placeIds, window, await altchaPayload(stack.baseUrl)), ...(goal ? { goal } : {}) };
  const res = await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  if (res.status !== 202) throw new Error(`search not accepted: ${res.status} ${await res.text()}`);
  const created = (await res.json()) as { search_id: string; token: string };
  const started = Date.now();
  let status = 'queued';
  while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
    status = ((await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}?token=${created.token}`)).json()) as { search: { status: string } }).search.status;
    if (['done', 'partial', 'failed'].includes(status)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  return { id: created.search_id, token: created.token, status };
}

const api = (stack: DemoStack, s: GoalSearch, path: string, query = '') => fetch(`${stack.baseUrl}/api/v1/searches/${s.id}${path}?token=${s.token}${query}`);

export async function getFinale(stack: DemoStack, s: GoalSearch, query = ''): Promise<FinaleResponse> {
  return finaleResponseSchema.parse(await (await api(stack, s, '/finale', query)).json());
}

export async function getResults(stack: DemoStack, s: GoalSearch, query = '') {
  return searchResultsResponseSchema.parse(await (await api(stack, s, '/results', query)).json());
}

export async function getDetail(stack: DemoStack, s: GoalSearch, hotelId: string) {
  return hotelDetailResponseSchema.parse(await (await api(stack, s, `/hotels/${encodeURIComponent(hotelId)}`)).json());
}

export const GOAL_NAMES: Record<Goal, string> = { sparen: 'Günstig und sauber', ausgewogen: 'Preis-Leistung', komfort: 'Komfort' };

export const REASON_NAMES: Record<keyof FinaleResponse['excluded'], string> = {
  filters: 'Filter oder Budget nicht erfüllt',
  no_reviews: 'ohne Bewertungen',
  red_flag: 'Warnsignale (Schimmel, Ungeziefer, Schmutz)',
  star_trap: 'Sterne-Falle',
  low_quality: 'zu schwach bewertet für das Ziel',
  too_expensive: 'zu teuer für das Ziel',
  dominated: 'es gibt ein besseres Angebot',
};

export const euro = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const one = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const LOCATION = { kern: 'im Ortskern', ort: 'im Ort', ausserhalb: 'außerhalb' } as const;

/** One finalist as the finale card reads it. */
export function finalistLine(f: FinalistDto, base: FinalistDto): string {
  const head = `${f.hotel.name}${f.hotel.stars ? ` ${'★'.repeat(Math.round(f.hotel.stars))}` : ''} · Qualität ${f.quality.score === null ? '–' : one(f.quality.score)} · ${euro(f.offer.total_price_eur)} · ${f.offer.place_name} ${f.offer.checkin}`;
  const where = f.location ? `${LOCATION[f.location]}${f.center_distance_km !== null && f.location !== 'kern' ? ` (${one(f.center_distance_km)} km)` : ''}` : null;
  const labels = f.labels.length > 0 ? `Lob: ${f.labels.map((l) => l.label).join(', ')}` : null;
  const compare =
    f === base
      ? 'günstigste der Auswahl'
      : [
          Math.round(f.price_delta_eur) === 0 ? `etwa gleicher Preis wie ${base.hotel.name}` : `+${euro(f.price_delta_eur)} gegenüber ${base.hotel.name}`,
          f.gains.length > 0 ? `dafür: ${f.gains.map((g) => g.label).join(', ')}` : null,
          f.losses.length > 0 ? `dafür nicht: ${f.losses.map((g) => g.label).join(', ')}` : null,
          f.quality_delta !== null ? `Bewertung ${f.quality_delta > 0 ? '+' : '−'}${one(Math.abs(f.quality_delta))}` : null,
          f.other_place ? 'anderer Ort' : null,
          f.other_dates ? 'anderer Termin' : null,
        ]
          .filter(Boolean)
          .join(' · ');
  return [head, where, labels, compare].filter(Boolean).join('\n      ');
}

/** Houses accounted for: excluded per reason + finalists + runners-up = houses in the search. */
export function accountedFor(f: FinaleResponse): boolean {
  const excluded = Object.values(f.excluded).reduce((a, b) => a + b, 0);
  return excluded + f.finalists.length + f.runners_up === f.hotels;
}

/** Cheapest first, the first without surcharge, every surcharge the price difference. */
export function orderedBySurcharge(f: FinaleResponse): boolean {
  const [first, ...rest] = f.finalists;
  if (!first) return true;
  let previous = first.offer.total_price_eur;
  for (const x of rest) {
    if (x.offer.total_price_eur < previous) return false;
    if (Math.abs(x.price_delta_eur - (x.offer.total_price_eur - first.offer.total_price_eur)) > 0.005) return false;
    previous = x.offer.total_price_eur;
  }
  return first.price_delta_eur === 0 && first.gains.length === 0 && first.losses.length === 0;
}
