import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 3: postal code as start location, several places picked by name
// (Köln, Frankfurt, Berlin) next to the suggestions, both on one page.
export const orteFlow: Flow = {
  name: 'orte',
  mode: 'P',
  description:
    'Startort per Postleitzahl, Orte selbst wählen (Köln, Frankfurt, Berlin) auf derselben Seite wie die Vorschläge; einmal nur die eigenen Orte, einmal eigene Orte zusätzlich zu den Vorschlägen.',
  async run({ page, baseUrl, step }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Startort per Postleitzahl 70173',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('70173');
        await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
      },
      { expectSelector: ['[data-origin="2825297"]'], expectText: ['Wohin soll es gehen?', 'Orte vorschlagen lassen', 'Orte selbst wählen'] },
    );
    await pickWindow(page, '2026-10-01', '2026-10-12');
    await step(
      'Orte selbst wählen: Köln, Frankfurt, Berlin',
      async () => {
        for (const [q, option] of [
          ['Köln', /^Köln/],
          ['Frankf', /^Frankfurt am Main/],
          ['Berlin', /^Berlin/],
        ] as const) {
          await page.getByTestId('own-places-input').fill(q);
          await page.getByRole('option', { name: option }).first().click();
        }
        await page.getByTestId('own-place-chip').nth(2).waitFor();
      },
      { expectText: ['Köln', 'Frankfurt am Main', 'Berlin', 'Weiter zu den Regionen'] },
    );
    await step(
      'Häkchen „Orte vorschlagen lassen“ raus → Startort nur noch optional, Fahrzeiten bleiben an den Orten, Ortsliste mit genau diesen Orten',
      async () => {
        await page.getByTestId('toggle-suggest').uncheck();
        // Only the optional start location stays (for the drive times); no drive time field.
        await page.getByTestId('origin-fields').waitFor({ state: 'detached' });
        await page.getByTestId('origin-optional').waitFor();
        await page.getByTestId('own-place-chip').filter({ hasText: /\d+ h|\d+ min/ }).first().waitFor();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('combination-count').filter({ hasText: '3 Orte × 2 Termine = 6 Kombinationen' }).waitFor();
      },
      { expectText: ['Deine Orte', 'Köln', 'Frankfurt am Main', 'Berlin', '3 von 10 Orten ausgewählt'], fullPage: true },
    );
    await step(
      'Zurück, Frankfurt entfernen, Wandern, Weiter zu den Regionen: eigene Orte und Vorschläge zusammen',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).click();
        await page.getByTestId('toggle-suggest').check();
        await page.getByRole('button', { name: 'Frankfurt am Main entfernen' }).click();
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
        await page.getByTestId('regions-next').click();
        await page.getByTestId('place-row').first().waitFor({ timeout: 30_000 });
      },
      { expectText: ['Deine Orte', 'Köln', 'Berlin'], rejectText: ['Frankfurt am Main'], fullPage: true },
    );
    await step(
      'Bestätigen und Suche über eigene und vorgeschlagene Orte starten',
      async () => {
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]+/, { timeout: 30_000 });
        await page.getByRole('heading', { name: 'Suche abgeschlossen' }).waitFor({ timeout: 90_000 });
      },
      { expectText: ['Köln', 'Berlin'] },
    );
  },
};
