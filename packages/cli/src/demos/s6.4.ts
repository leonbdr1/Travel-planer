// S6.4 demo: calibration report on a finished search of the local stack
// (simulated LiteAPI world; the real calibration needs sandbox data, BG-05).
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { constants } from '@reiseplaner/domain';
import { calibrationReport } from '../commands/calibrate';
import { seedDevData } from '../seed';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack } from '../lib/stack';

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Oberstdorf', 'Füssen', 'Baiersbronn', 'Titisee-Neustadt', 'Bad Wildbad', 'Todtnau', 'Hinterzarten', 'Sonthofen']);
    const request = { ...demoSearchRequest(places, { start: '2026-10-01', end: '2026-11-30' }, await altchaPayload(stack.baseUrl)) };
    const created = (await (await fetch(`${stack.baseUrl}/api/v1/searches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json()) as {
      search_id: string;
      token: string;
    };
    const started = Date.now();
    while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
      const status = ((await (await fetch(`${stack.baseUrl}/api/v1/searches/${created.search_id}?token=${created.token}`)).json()) as { search: { status: string } }).search.status;
      if (['done', 'partial', 'failed'].includes(status)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    const { markdown, rates } = await calibrationReport(stack.db.db, created.search_id, 'simulierte LiteAPI-Welt (Fake-Modus), Suche Stuttgart, 8 Orte × 9 Freitage; nicht repräsentativ für echte Daten');
    mkdirSync(resolve(repoRoot, 'docs/demos/S6.4'), { recursive: true });
    writeFileSync(resolve(repoRoot, 'docs/demos/S6.4/kalibrierung.md'), markdown);
    for (const line of markdown.split('\n')) out.log(line);
    const inCorridor = Object.values(rates).every((r) => r >= constants.CALIBRATION_BARGAIN_RATE_MIN && r <= constants.CALIBRATION_BARGAIN_RATE_MAX);
    out.log(inCorridor ? '→ Schnäppchenquote je Typ im Zielkorridor' : '→ Quote außerhalb des Korridors: siehe Bericht (Vorschlag statt Änderung)');
    return 0;
  } finally {
    await stack.stop();
  }
}
