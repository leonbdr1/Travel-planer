import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

// Aufgabe 9: an "i" next to the price matrix says that the prices are
// pre-filtered and what is left out, with a link to "So filtern wir".
export const filterFlow: Flow = {
  name: 'filter',
  mode: 'P',
  description:
    'Info-Symbol an der Preis-Matrix: beim Draufhalten kurzer Hinweis, dass vorgefiltert wurde und was, mit Link „Mehr Details hier“ auf die Seite „So filtern wir“.',
  async run({ page, baseUrl, step }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Ergebnisse: „i“ neben der Preis-Matrix, Hinweis nicht dauerhaft sichtbar',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl, 'Füssen');
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-matrix').waitFor({ timeout: 90_000 });
        await page.getByTestId('matrix-heading').scrollIntoViewIfNeeded();
      },
      { expectText: ['Preis-Matrix (Gesamtpreis ab)'], expectSelector: ['[data-testid="matrix-filter-info"]'], rejectText: ['Nicht eingerechnet'] },
    );
    await step(
      'Maus auf das „i“',
      async () => {
        await page.getByTestId('matrix-filter-info').hover();
        await page.getByTestId('matrix-filter-info-panel').waitFor();
      },
      { expectText: ['Vorgefiltert', 'Nicht eingerechnet', 'Schimmel', 'Mehr Details hier'] },
    );
    await step(
      '„Mehr Details hier“ → Seite „So filtern wir“',
      async () => {
        await page.getByTestId('matrix-filter-more').click();
        await page.getByTestId('filter-page').waitFor();
      },
      { expectText: ['So filtern wir', 'Schimmel, Ungeziefer, Schmutz', 'Zu schwach bewertet', 'Viele Sterne zum Billigpreis', 'Was nicht herausfällt'], fullPage: true },
    );
  },
};
