import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F15: Europe extension. From Munich with "Strand und Meer" and no
// drive-time limit the suggestions reach the Adriatic and the Mediterranean,
// the mini maps switch to Europe, and Venedig can be picked as an own place
// and searched like any other place.
export const europaFlow: Flow = {
  name: 'europa',
  mode: 'P',
  description: 'Europa-Erweiterung: Regionen in ganz Europa (Strand ab München), Mini-Karte mit Europa-Ausschnitt, Venedig als eigener Ort bis zur fertigen Suche.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Startort München, Fahrzeit egal, Strand und Meer',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Münch');
        await page.getByRole('option', { name: /^München, Bayern, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.locator('#max-drive').selectOption('');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Strand und Meer' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const names = await page.getByTestId('region-card').locator('h3').allInnerTexts();
        const europe = await page.locator('[data-testid="region-card"] svg[data-frame="europe"]').count();
        note(`Regionen: ${names.join(', ')}; ${europe} Mini-Karten mit Europa-Ausschnitt.`);
        if (europe === 0) throw new Error('no region card shows the Europe frame');
      },
      { expectText: ['Passende Regionen', 'Strand und Meer'], expectSelector: ['[data-testid="region-card"] svg[data-frame="europe"]'] },
    );
    await step(
      'Zurück: Venedig als eigenen Ort wählen, nur diesen Ort suchen',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('toggle-own').check();
        await page.getByTestId('own-places-input').fill('Venedig');
        await page.getByRole('option', { name: /^Venedig/ }).first().click();
        await page.getByTestId('own-place-chip').first().waitFor();
        await page.getByTestId('toggle-suggest').uncheck();
        await page.locator('#nights').selectOption('2');
      },
      { expectText: ['Venedig'] },
    );
    await step(
      'Suche über Venedig bis zum Ergebnis',
      async () => {
        await page.getByTestId('frame-next').click();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]+/, { timeout: 30_000 });
        await page.getByRole('heading', { name: 'Suche abgeschlossen' }).waitFor({ timeout: 90_000 });
      },
      { expectText: ['Venedig', 'Suche abgeschlossen'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step('Handy (390 px)', async () => page.getByRole('heading', { name: 'Suche abgeschlossen' }).scrollIntoViewIfNeeded(), { expectText: ['Venedig'], fullPage: false });
  },
};
