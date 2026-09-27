import { env, exports } from 'cloudflare:workers';
import { introspectWorkflow } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';
import { createSearchResponseSchema, hotelDetailResponseSchema, searchProgressResponseSchema, searchResultsResponseSchema } from '@reiseplaner/contracts';
import { createPostgresDb } from '@reiseplaner/db';

let n = 0;
const ip = () => `192.0.2.${++n}`;
const api = (path: string, init: RequestInit = {}, client = ip()) =>
  exports.default.fetch(`http://app.test/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': client, ...(init.headers ?? {}) },
  });

async function altchaPayload(): Promise<string> {
  const challenge = (await (await api('/meta/altcha-challenge')).json()) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) throw new Error('unsolved');
  return btoa(JSON.stringify({ challenge, solution }));
}

async function placeIds(names: string[]): Promise<string[]> {
  const db = createPostgresDb(env.HYPERDRIVE.connectionString, { max: 1 });
  try {
    const rows = await db.query<{ id: string; name: string }>(
      "SELECT id::text AS id, name FROM app.places WHERE kind = 'catalog' AND name = ANY($1::text[])",
      [names],
    );
    return names.map((name) => rows.find((r) => r.name === name)?.id ?? '');
  } finally {
    await db.close();
  }
}

async function body(places: string[], extra: Record<string, unknown> = {}) {
  return {
    origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78232, lng: 9.17702 },
    max_drive_minutes: 180,
    themes: ['wandern'],
    window: { start: '2026-10-01', end: '2026-11-01' },
    nights: 2,
    arrival_weekdays: [5],
    occupancy: { rooms: 1, adults: 2, children_ages: [] },
    budget_total_eur: null,
    filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
    chips: [],
    place_ids: await placeIds(places),
    altcha: await altchaPayload(),
    ...extra,
  };
}

describe('ALTCHA', () => {
  it('issues signed challenges that the client can solve', async () => {
    const res = await api('/meta/altcha-challenge');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const challenge = (await res.json()) as Challenge;
    expect(challenge.parameters.algorithm).toBe('SHA-256');
    expect(challenge.signature).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('POST /searches → SearchWorkflow → GET /searches/{id}', () => {
  it('runs 2 places × 5 Fridays to done with offers and a token-protected progress view', async () => {
    await using introspector = await introspectWorkflow(env.SEARCH_WORKFLOW as unknown as Workflow);
    const res = await api('/searches', { method: 'POST', body: JSON.stringify(await body(['Oberstdorf', 'Füssen'])) });
    expect(res.status).toBe(202);
    const created = createSearchResponseSchema.parse(await res.json());
    const [instance] = await introspector.get();
    if (!instance) throw new Error('no workflow instance');
    await instance.waitForStatus('complete');
    expect(await instance.getOutput()).toEqual({ status: 'done' });

    const progress = searchProgressResponseSchema.parse(
      await (await api(`/searches/${created.search_id}?token=${created.token}`)).json(),
    );
    expect(progress.search).toMatchObject({ status: 'done', combos_total: 10, combos_done: 10, combos_failed: 0 });
    expect(progress.places.map((p) => p.name)).toEqual(['Oberstdorf', 'Füssen']);
    expect(progress.dates.map((d) => d.checkin)).toEqual(['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30']);
    expect(progress.cells).toHaveLength(10);
    expect(progress.cells.every((c) => c.state === 'offer' || c.state === 'no_offer')).toBe(true);
    expect(progress.offers_count).toBeGreaterThan(0);

    const wrongToken = await api(`/searches/${created.search_id}?token=${'x'.repeat(43)}`);
    expect(wrongToken.status).toBe(404);

    // Results: matrix 2 × 5, every hotel exactly once, filters without a new search.
    const results = searchResultsResponseSchema.parse(
      await (await api(`/searches/${created.search_id}/results?token=${created.token}`)).json(),
    );
    expect(results.matrix.cells).toHaveLength(10);
    expect(results.matrix.cells.every((c) => ['offer', 'empty', 'failed'].includes(c.state))).toBe(true);
    const hotelIds = results.items.map((i) => i.hotel.id);
    expect(new Set(hotelIds).size).toBe(hotelIds.length);
    expect(results.items.length).toBe(results.counts.hotels);
    const ranks = results.items.map((i) => i.best_offer.rank_score);
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
    const byPrice = searchResultsResponseSchema.parse(
      await (await api(`/searches/${created.search_id}/results?token=${created.token}&sort=price`)).json(),
    );
    const prices = byPrice.items.map((i) => i.best_offer.total_price_eur);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    const tooCheap = searchResultsResponseSchema.parse(
      await (await api(`/searches/${created.search_id}/results?token=${created.token}&budget=1`)).json(),
    );
    expect(tooCheap.items).toEqual([]);
    expect(tooCheap.filters.budget_total_eur).toBe(1);
    expect(tooCheap.matrix.cells.every((c) => c.state !== 'offer')).toBe(true);
    const cell = results.matrix.cells.find((c) => c.state === 'offer');
    const scoped = searchResultsResponseSchema.parse(
      await (await api(`/searches/${created.search_id}/results?token=${created.token}&place_id=${cell?.place_id}&checkin=${cell?.checkin}`)).json(),
    );
    expect(scoped.items.every((i) => i.best_offer.place_id === cell?.place_id && i.best_offer.checkin === cell?.checkin)).toBe(true);

    // Detail: all dates of one hotel with the score breakdown.
    const top = results.items[0];
    const detail = hotelDetailResponseSchema.parse(
      await (await api(`/searches/${created.search_id}/hotels/${top?.hotel.id}?token=${created.token}`)).json(),
    );
    expect(detail.offers.length).toBeGreaterThanOrEqual(1);
    expect(detail.offers.every((o) => o.hotel_id === top?.hotel.id)).toBe(true);
    expect(detail.score.priorWeight).toBe(50);
    expect(detail.hotel.description).toBeTruthy();
  });

  it('rejects missing, forged and reused ALTCHA solutions', async () => {
    const valid = await body(['Oberstdorf']);
    const forged = await api('/searches', { method: 'POST', body: JSON.stringify({ ...valid, altcha: btoa('{"nope":1}') }) });
    expect(forged.status).toBe(400);
    expect(await forged.json()).toMatchObject({ error: { code: 'altcha_invalid' } });
    await using introspector = await introspectWorkflow(env.SEARCH_WORKFLOW as unknown as Workflow);
    expect((await api('/searches', { method: 'POST', body: JSON.stringify(valid) })).status).toBe(202);
    const reused = await api('/searches', { method: 'POST', body: JSON.stringify(valid) });
    expect(reused.status).toBe(400);
    expect(await reused.json()).toMatchObject({ error: { details: { reason: 'reused' } } });
    for (const instance of await introspector.get()) await instance.waitForStatus('complete');
  });

  it('validates limits: too many combinations and unknown places', async () => {
    const tooMany = await api('/searches', {
      method: 'POST',
      body: JSON.stringify(await body(['Oberstdorf'], { window: { start: '2026-10-01', end: '2026-11-15' }, arrival_weekdays: [5, 6] })),
    });
    expect(tooMany.status).toBe(400);
    expect(await tooMany.json()).toMatchObject({ error: { code: 'too_many_dates', details: { count: 13 } } });
    const unknown = await api('/searches', {
      method: 'POST',
      body: JSON.stringify({ ...(await body(['Oberstdorf'])), place_ids: ['00000000-0000-4000-8000-000000000000'] }),
    });
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({ error: { code: 'unknown_place' } });
  });

  it('answers the 11th search of the same client within an hour with 429 and Retry-After', async () => {
    const client = ip();
    await using introspector = await introspectWorkflow(env.SEARCH_WORKFLOW as unknown as Workflow);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await api('/searches', { method: 'POST', body: JSON.stringify(await body(['Füssen'])) }, client);
      statuses.push(res.status);
      if (res.status === 429) expect(res.headers.get('retry-after')).toBe('3600');
      await res.body?.cancel();
    }
    expect(statuses.slice(0, 10).every((s) => s === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
    for (const instance of await introspector.get()) await instance.waitForStatus('complete');
  }, 120_000);
});
