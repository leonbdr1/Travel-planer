import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 13: a coarse map shows where the suggested regions lie (Allgäu in
// the south-east, Black Forest in the south-west …), each card has a mini map.
export const karteFlow: Flow = {
  name: 'karte',
  mode: 'P',
  description: 'Passende Regionen: eine kleine Karte je Region zeigt die Lage; das große Übersichtsbild oben gibt es nicht mehr (Ben, 29.09.).',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Regionen ohne große Übersichtskarte, aber mit Mini-Karte je Region',
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
        await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
        if ((await page.getByTestId('region-map').count()) > 0) throw new Error('the big overview map is still there');
        const minis = await page.locator('[data-testid="region-card"] svg[data-testid="overview-map"]').count();
        const cards = await page.getByTestId('region-card').count();
        if (minis !== cards) throw new Error(`mini maps ${minis} ≠ region cards ${cards}`);
        note(`${cards} Regionskarten, jede mit Mini-Karte; keine große Übersichtskarte.`);
      },
      { expectText: ['Passende Regionen'], rejectText: ['Wo liegen die Regionen?'], expectSelector: ['[data-testid="region-card"] svg[data-testid="overview-map"]'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step('Handy (390 px)', async () => page.getByTestId('region-list').scrollIntoViewIfNeeded(), { expectSelector: ['[data-testid="region-list"]'], fullPage: false });
  },
};
