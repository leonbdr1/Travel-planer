import type { Flow } from '../types';
import { prepareSixtyCombinations } from './suche';

/**
 * Search progress with slow providers. Ben's Testbetrieb on 2026-09-29: while
 * the real LiteAPI answered slowly, the progress polls failed with
 * CONNECT_TIMEOUT and the page stood still at 60 of 100. Run with
 * REISEPLANER_FAKE_LATENCY_MS=4000 to simulate that; every request of the page
 * must succeed.
 */
export const langsamFlow: Flow = {
  name: 'langsam',
  mode: 'P',
  description:
    'Suche mit langsamen Anbietern (REISEPLANER_FAKE_LATENCY_MS, z. B. 4000 wie die echte LiteAPI): 5 Orte × 12 Termine; jede Fortschrittsabfrage der Seite gelingt, keine Serverfehler, die Suche endet mit Ergebnissen.',
  async run({ page, baseUrl, step, note }) {
    const serverErrors: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 500 && res.url().includes('/api/')) serverErrors.push(`${res.status()} ${new URL(res.url()).pathname}`);
    });
    const latency = process.env.REISEPLANER_FAKE_LATENCY_MS ?? '150 (Standard)';

    await step('Ortsliste bestätigt: 60 Kombinationen', async () => prepareSixtyCombinations(page, baseUrl), {
      expectText: ['5 Orte × 12 Termine = 60 Kombinationen', 'Suche starten'],
    });

    await step(
      'Suche mit langsamen Anbietern bis zum Ergebnis, ohne Serverfehler',
      async () => {
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        const started = Date.now();
        let shown = '';
        let changedAt = started;
        let longestStill = 0;
        const seen: string[] = [];
        for (;;) {
          if (Date.now() - started > 8 * 60_000) throw new Error(`search not done after 8 min (last progress: ${shown})`);
          const done = (await page.getByTestId('results').count()) > 0;
          const text = done ? 'Ergebnisse' : (await page.getByTestId('search-progress').innerText().catch(() => shown)).trim();
          if (text !== shown) {
            longestStill = Math.max(longestStill, Date.now() - changedAt);
            shown = text;
            changedAt = Date.now();
            seen.push(`${Math.round((Date.now() - started) / 1000)} s: ${text}`);
          }
          if (done) break;
          await page.waitForTimeout(500);
        }
        note(`Latenz der simulierten Anbieter: ${latency} ms je Aufruf (0,5- bis 1,5-fach).`);
        note(`Bis zu den Ergebnissen: ${Math.round((Date.now() - started) / 1000)} s; längste Zeit ohne neue Anzeige: ${Math.round(longestStill / 1000)} s.`);
        note(`Fortschritt: ${seen.join(' → ')}`);
        note(`Serverfehler der Seite während der Suche: ${serverErrors.length}${serverErrors.length ? ` (${[...new Set(serverErrors)].slice(0, 3).join(', ')})` : ''}.`);
        if (serverErrors.length > 0) throw new Error(`${serverErrors.length} server errors during the search, e.g. ${serverErrors[0]}`);
      },
      { expectText: ['Deine Auswahl', 'Alle Angebote'], expectSelector: ['[data-testid="results"]'], fullPage: false },
    );
  },
};
