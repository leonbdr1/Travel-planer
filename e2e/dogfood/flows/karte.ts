import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 13: a coarse map shows where the suggested regions lie (Allgäu in
// the south-east, Black Forest in the south-west …), each card has a mini map.
export const karteFlow: Flow = {
  name: 'karte',
  mode: 'P',
  description: 'Regionen mit grober Karte: Übersicht mit Startort und allen Regionen, Mini-Karte je Region, beim Draufzeigen wird die Region auf der Übersicht hervorgehoben.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Regionen mit Übersichtskarte und Mini-Karten',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Stutt');
        await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.locator('#max-drive').selectOption('240');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-map').waitFor({ timeout: 30_000 });
      },
      { expectText: ['Wo liegen die Regionen?', 'Dein Startort: Stuttgart'], expectSelector: ['[data-testid="region-map"] [data-testid="map-marker"]', '[data-testid="region-card"] svg[data-testid="overview-map"]'] },
    );
    await step(
      'Maus auf „Allgäu“: auf der Karte hervorgehoben',
      async () => {
        const card = page.getByTestId('region-card').filter({ hasText: 'Allgäu' });
        await card.hover();
        await page.locator('[data-testid="region-map"] [data-testid="map-marker"][data-strong]').first().waitFor();
        note(`Hervorgehoben: ${await page.locator('[data-testid="region-map"] [data-testid="map-marker"][data-strong] text').allInnerTexts()}`);
        await page.getByTestId('region-map').scrollIntoViewIfNeeded();
      },
      { expectSelector: ['[data-testid="region-map"] [data-testid="map-marker"][data-strong]'], fullPage: false },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step('Handy (390 px)', async () => page.getByTestId('region-map').scrollIntoViewIfNeeded(), { expectSelector: ['[data-testid="region-map"]'], fullPage: false });
  },
};
