import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F17: a region with exactly one highlight among the places that fit
// the search is named after that place ("Bozen", small "Region Eisacktal und
// Bozen" below); with two or more highlights the region keeps its name.
export const regionsnameFlow: Flow = {
  name: 'regionsname',
  mode: 'P',
  description: 'Regionsname: bei nur einem Highlight-Ort steht der Ort als Überschrift (darunter „Region …“), bei mehreren Highlights der Regionsname (Ben, 29.09.).',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Kultur ab München bis 7 h: Bozen statt „Eisacktal und Bozen“, Elsass bleibt Elsass',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Münch');
        await page.getByRole('option', { name: /^München, Bayern, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.locator('#max-drive').selectOption('420');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Kultur und Sehenswürdigkeiten' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const titles = await page.getByTestId('region-card').locator('h3').allInnerTexts();
        const subtitles = await page.getByTestId('region-subtitle').allInnerTexts();
        note(`Überschriften: ${titles.join(', ')}; Unterzeilen: ${subtitles.join(', ')}`);
      },
      { expectText: ['Bozen', 'Region Eisacktal und Bozen', 'Elsass'], expectSelector: ['[data-testid="region-subtitle"]'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step('Handy (390 px)', async () => page.getByTestId('region-subtitle').first().scrollIntoViewIfNeeded(), { expectText: ['Region Eisacktal und Bozen'], fullPage: false });
  },
};
