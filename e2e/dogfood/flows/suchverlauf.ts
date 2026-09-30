import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

export const suchverlaufFlow: Flow = {
  name: 'suchverlauf',
  mode: 'P',
  description:
    'Letzte Suchen und frische Preise (B3): die Startseite zeigt die letzten Suchen dieses Browsers; nach 30 Minuten warnt die Ergebnisseite vor alten Preisen und startet dieselbe Suche neu.',
  async run({ page, baseUrl, step, note }) {
    let firstUrl = '';
    await step(
      'Suche Füssen, 2 Termine: Preise mit Uhrzeit',
      async () => {
        await page.goto(baseUrl);
        await page.evaluate(() => localStorage.clear());
        await prepareSinglePlaceSearch(page, baseUrl);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').first().waitFor({ timeout: 90_000 });
        firstUrl = page.url();
      },
      { expectText: ['Preise von', 'Preise aktualisieren'], expectSelector: ['[data-testid="fetched-at"]:not([data-stale])'], fullPage: false },
    );

    await step(
      'Startseite: „Letzte Suchen“ mit Ort und Zeitraum',
      async () => {
        await page.goto(baseUrl);
        await page.getByTestId('recent-search').first().waitFor();
        note(`Einträge: ${(await page.getByTestId('recent-search').allInnerTexts()).join(' | ')}`);
      },
      { expectText: ['Letzte Suchen', 'Füssen · 01.10.–12.10.2026'], fullPage: false },
    );

    await step(
      'Klick auf die letzte Suche öffnet ihre Ergebnisse',
      async () => {
        await page.getByTestId('recent-search').first().click();
        await page.getByTestId('result-list').first().waitFor({ timeout: 30_000 });
        if (page.url() !== firstUrl) throw new Error(`opened ${page.url()} instead of ${firstUrl}`);
      },
      { expectText: ['Alle Angebote'], fullPage: false },
    );

    await step(
      '40 Minuten später: Hinweis auf alte Preise mit „Preise aktualisieren“',
      async () => {
        await page.clock.install({ time: new Date(Date.now() + 40 * 60_000) });
        await page.reload();
        await page.locator('[data-testid="fetched-at"][data-stale]').waitFor({ timeout: 30_000 });
      },
      { expectText: ['sie können sich inzwischen geändert haben', 'Preise aktualisieren'], expectSelector: ['[data-testid="fetched-at"][data-stale] [data-testid="refresh-prices"]'], fullPage: false },
    );

    await step(
      '„Preise aktualisieren“ startet dieselbe Suche neu',
      async () => {
        await page.getByTestId('refresh-prices').click();
        await page.waitForURL((url) => url.href !== firstUrl && /\/suche\/[0-9a-f-]{36}#t=/.test(url.href), { timeout: 30_000 });
        await page.getByTestId('search-progress').waitFor({ timeout: 30_000 });
        note(`Neue Suche: ${page.url().split('#')[0]}`);
      },
      { expectText: ['Kombinationen'], fullPage: false },
    );

    await step(
      'Startseite: beide Suchen, die neue zuerst; eine entfernen',
      async () => {
        await page.goto(baseUrl);
        await page.getByTestId('recent-search').first().waitFor();
        const before = await page.getByTestId('recent-search').count();
        if (before !== 2) throw new Error(`expected 2 recent searches, found ${before}`);
        await page.getByRole('button', { name: /entfernen$/ }).first().click();
        const after = await page.getByTestId('recent-search').count();
        if (after !== 1) throw new Error(`expected 1 after removing, found ${after}`);
        note(`Vorher ${before}, nach „entfernen“ ${after}.`);
      },
      { expectSelector: ['[data-testid="recent-searches"]'], fullPage: false },
    );
  },
};
