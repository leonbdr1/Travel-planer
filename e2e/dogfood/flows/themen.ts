import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F14: culture and shopping are separate themes. "Shopping und
// Großstadt" leads to the big cities (Frankfurt, Köln), not to old towns
// like Füssen; "Kultur und Sehenswürdigkeiten" keeps the old towns.
export const themenFlow: Flow = {
  name: 'themen',
  mode: 'P',
  description: 'Reiseart: „Kultur und Sehenswürdigkeiten“ und „Shopping und Großstadt“ sind getrennte Themen; Shopping schlägt Großstädte vor (Ben, 29.09.).',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Themen mit Kultur, Shopping und Strand',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Stutt');
        await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.locator('#max-drive').selectOption('300');
        await page.getByTestId('theme-chips').scrollIntoViewIfNeeded();
      },
      { expectText: ['Kultur und Sehenswürdigkeiten', 'Shopping und Großstadt', 'Strand und Meer'], rejectText: ['Städte und Kultur'] },
    );
    await step(
      'Shopping: Großstädte statt Altstädte',
      async () => {
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Shopping und Großstadt' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
        const names = await page.getByTestId('region-card').locator('h3').allInnerTexts();
        note(`Regionen bei Shopping: ${names.join(', ')}`);
      },
      { expectText: ['Frankfurt', 'Shopping und Großstadt'], rejectText: ['Allgäu'] },
    );
    await step(
      'Kultur: Altstädte und Sehenswürdigkeiten',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Shopping und Großstadt' }).click();
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Kultur und Sehenswürdigkeiten' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
        const names = await page.getByTestId('region-card').locator('h3').allInnerTexts();
        note(`Regionen bei Kultur: ${names.join(', ')}`);
      },
      { expectText: ['Romantische Straße', 'Kultur und Sehenswürdigkeiten'] },
    );
  },
};
