import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 4: 2 to 3 nights; the matrix has a column per stay, the list and the
// detail say what the third night costs compared with the nights before.
export const naechteFlow: Flow = {
  name: 'naechte',
  mode: 'P',
  description:
    'Flexible Nächte: Füssen, Freitage 02.–19.10., 2 bis 3 Nächte → je Freitag Fr–So und Fr–Mo; Matrix-Spalten je Variante, Übersicht „3 statt 2 Nächte?“, Hinweis zur 3. Nacht in Liste und Detailansicht.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      '2 bis 3 Nächte einstellen: 6 Termine',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Stutt');
        await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-19');
        await page.locator('#nights').selectOption('2');
        await page.locator('#nights-max').selectOption('3');
        await page.getByTestId('date-count').filter({ hasText: '6 Termine' }).waitFor();
        await page.getByTestId('date-count').scrollIntoViewIfNeeded();
      },
      { expectText: ['Daraus entstehen 6 Termine', '02.10.–04.10.', '02.10.–05.10.', 'mit 2 bis 3 Nächten'] },
    );
    await step(
      'Nur Füssen, Suche starten',
      async () => {
        await page.getByTestId('own-places-input').fill('Füssen');
        await page.getByRole('option', { name: /^Füssen/ }).first().click();
        await page.getByTestId('own-only').click();
        await page.getByTestId('combination-count').filter({ hasText: '1 Ort × 6 Termine = 6 Kombinationen' }).waitFor();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('results').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 30_000 });
      },
      {
        expectText: ['6 von 6 Kombinationen', '2 Nächte', '3 Nächte', '3 statt 2 Nächte?', '3. Nacht'],
        expectSelector: ['[data-testid="nights-summary"]', '[data-testid="extra-night"]'],
        fullPage: true,
      },
    );
    const verdicts = await page.getByTestId('result-list').getByTestId('extra-night').evaluateAll((els) => els.map((el) => el.getAttribute('data-verdict')));
    note(`Hinweise zur 3. Nacht in der Liste: ${verdicts.length} (günstig ${verdicts.filter((v) => v === 'cheap').length}, normal ${verdicts.filter((v) => v === 'normal').length}, teuer ${verdicts.filter((v) => v === 'expensive').length}).`);
    note(`Übersicht: ${await page.getByTestId('nights-summary').innerText()}`);
    await step(
      'Detailansicht: Hinweis zur 3. Nacht je Termin und Zimmer',
      async () => {
        await page.getByTestId('result-list').getByTestId('result-name').first().click();
        await page.getByTestId('detail-offers').first().waitFor({ timeout: 30_000 });
        await page.getByTestId('extra-night').first().scrollIntoViewIfNeeded();
      },
      { expectText: ['3. Nacht', 'Fr 02.10. – Mo 05.10.'], expectSelector: ['[data-testid="detail-offers"] [data-testid="extra-night"]'] },
    );
  },
};
