import { openFilters } from './helpers';
import type { Flow } from '../types';
import { prepareSixtyCombinations } from './suche';

/** Hotel names of the main list, in order. */
const listNames = (page: import('@playwright/test').Page) => page.getByTestId('result-list').first().getByTestId('result-name').allInnerTexts();

export const listenfilterFlow: Flow = {
  name: 'listenfilter',
  mode: 'P',
  description:
    'Ergebnisliste wie bei Buchungsportalen (B1, B2): Unterkunftsart und Ausstattung als Filter ohne neue Suche, Namenssuche, Liste seitenweise mit „Weitere anzeigen“, Sortierung nach Fahrzeit.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suche 5 Orte × 9 Termine: Liste zeigt die erste Seite',
      async () => {
        await prepareSixtyCombinations(page, baseUrl, '2026-11-30', 9);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').first().waitFor({ timeout: 90_000 });
        const names = await listNames(page);
        if (names.length > 20) throw new Error(`first page shows ${names.length} houses`);
        note(`Erste Seite: ${names.length} Unterkünfte; Knopf: ${await page.getByTestId('show-more').innerText()}`);
      },
      { expectSelector: ['[data-testid="show-more"]', '[data-testid="filters-toggle"]', '[data-testid="name-search"]', '[data-testid="result-photo"] img'] },
    );

    await step(
      '„Weitere anzeigen“ hängt die nächste Seite an',
      async () => {
        const before = (await listNames(page)).length;
        await page.getByTestId('show-more').click();
        await page.waitForFunction((n) => document.querySelectorAll('[data-testid="result-list"] [data-testid="result-name"]').length > n, before);
        // Names can repeat across places; the detail link identifies a house.
        const hrefs = await page.getByTestId('result-list').first().getByTestId('result-name').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
        if (new Set(hrefs).size !== hrefs.length) throw new Error('a house appears twice after loading more');
        note(`Vorher ${before}, nachher ${hrefs.length} Unterkünfte, keine doppelt.`);
      },
      { expectSelector: ['[data-testid="result-list"]'], fullPage: false },
    );

    await step(
      'Unterkunftsart „Ferienwohnung“: nur Wohnungen',
      async () => {
        await openFilters(page);
        await page.getByTestId('filter-kinds').getByRole('button', { name: 'Ferienwohnung' }).click();
        await page.getByTestId('apply-filters').click();
        await page.waitForFunction(() => {
          const names = Array.from(document.querySelectorAll('[data-testid="result-list"] [data-testid="result-name"]')).map((el) => el.textContent ?? '');
          return names.length > 0 && names.every((n) => /Ferienwohnung|Apartment|Chalet|Ferienhaus/i.test(n));
        }, undefined, { timeout: 15_000 });
        note(`Nur Ferienwohnungen: ${(await listNames(page)).join(', ')}`);
      },
      { expectSelector: ['[data-testid="filter-kinds"] [aria-pressed="true"]'] },
    );

    await step(
      'Ausstattung „Parkplatz“ dazu: Liste schrumpft oder bleibt, Filter bleibt gesetzt',
      async () => {
        const before = (await listNames(page)).length;
        await openFilters(page);
        await page.getByTestId('filter-facilities').getByRole('button', { name: 'Parkplatz' }).click();
        await page.getByTestId('apply-filters').click();
        await page.waitForTimeout(1500);
        const after = await page.getByTestId('result-list').first().getByTestId('result-name').count();
        if (after > before) throw new Error(`parking made the list longer: ${before} → ${after}`);
        note(`Mit Parkplatz: ${after} von ${before} Wohnungen.`);
      },
      { expectSelector: ['[data-testid="filter-facilities"] [aria-pressed="true"]'] },
    );
    await page.getByRole('button', { name: 'Zurücksetzen' }).click();
    await page.getByTestId('result-list').first().waitFor();

    await step(
      'Namenssuche „gasthof“ (Groß-/Kleinschreibung egal)',
      async () => {
        await page.getByTestId('name-search').fill('gasthof');
        await page.waitForFunction(() => {
          const names = Array.from(document.querySelectorAll('[data-testid="result-list"] [data-testid="result-name"]')).map((el) => el.textContent ?? '');
          return names.length > 0 && names.every((n) => n.toLowerCase().includes('gasthof'));
        }, undefined, { timeout: 15_000 });
        note(`Treffer: ${(await listNames(page)).join(', ')}`);
      },
      { expectSelector: ['[data-testid="result-matrix"]'] },
    );

    await step(
      'Namenssuche ohne Treffer',
      async () => {
        await page.getByTestId('name-search').fill('kein haus heißt so');
        await page.getByText('Keine Unterkunft mit diesem Namen.').waitFor({ timeout: 15_000 });
      },
      { expectText: ['Keine Unterkunft mit diesem Namen.'], fullPage: false },
    );
    await page.getByTestId('name-search').fill('');
    await page.getByTestId('result-list').first().waitFor();

    await step(
      'Sortierung „Fahrzeit“: nächster Ort zuerst',
      async () => {
        await page.getByTestId('sort').getByRole('radio', { name: 'Fahrzeit' }).click();
        await page.getByTestId('sort').getByRole('radio', { name: 'Fahrzeit', checked: true }).waitFor();
        await page.waitForTimeout(1200);
        const places = await page.getByTestId('result-list').first().locator('li').evaluateAll((els) =>
          els.map((el) => el.querySelector('[data-testid="result-place"]')?.textContent?.trim() ?? ''),
        );
        note(`Orte von oben nach unten: ${[...new Set(places)].join(' → ')}`);
      },
      { expectSelector: ['[data-testid="sort"] [aria-checked="true"]'] },
    );
  },
};
