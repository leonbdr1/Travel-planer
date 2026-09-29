import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 8: regions and places carry how much they offer; a small village
// without much to do is marked in the matrix and the list, not removed.
export const attraktivitaetFlow: Flow = {
  name: 'attraktivitaet',
  mode: 'P',
  description:
    'Attraktivität: Regionen und Orte mit Stufe (Top-Urlaubsort … Wenig los) und Erklärung beim Draufhalten; ein kleines Dorf (Balderschwang) als eigener Ort ist in Preis-Matrix und Liste als „wenig los“ markiert, bleibt aber drin.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Regionen mit Stufe',
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
      },
      { expectText: ['Top-Urlaubsort'], expectSelector: ['[data-testid="region-list"] [data-testid="attractiveness"]'], fullPage: true },
    );
    await step(
      'Maus auf das „i“ einer Region',
      async () => {
        await page.getByTestId('region-list').getByTestId('attractiveness-info').first().hover();
        await page.getByTestId('attractiveness-info-panel').first().waitFor();
      },
      { expectText: ['Eine Region zählt so viel wie ihre besten Orte.', 'Die besten Orte:', 'So bewerten wir Orte'] },
    );
    await page.mouse.move(0, 0);
    await page.getByTestId('attractiveness-info-panel').waitFor({ state: 'detached' });
    await step(
      'Orte mit Stufe, eigenes kleines Dorf dazu',
      async () => {
        // The best region is preselected.
        await page.getByTestId('regions-next').click();
        await page.getByTestId('place-row').first().waitFor({ timeout: 30_000 });
        const rows = page.getByTestId('place-row');
        for (let i = 2; i < (await rows.count()); i += 1) {
          const box = rows.nth(i).locator('input[type="checkbox"]');
          if (await box.isChecked()) await box.uncheck();
        }
        await page.getByTestId('own-place-input').fill('Balderschwang');
        await page.getByRole('option', { name: /^Balderschwang/ }).first().click();
        await page.getByText('Deine Orte').waitFor();
      },
      { expectText: ['Balderschwang', 'Wenig los'], expectSelector: ['[data-testid="place-row"] [data-testid="attractiveness"]'], fullPage: true },
    );
    await step(
      'Suche: Matrix und Liste markieren das Dorf',
      async () => {
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-matrix').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 30_000 });
      },
      { expectText: ['wenig los', 'günstiger, hat aber wenig zu bieten'], expectSelector: ['[data-testid="matrix-place-level"][data-level="wenig"]', '[data-testid="place-little-to-offer"]'], fullPage: true },
    );
    const levels = await page.getByTestId('matrix-place-level').evaluateAll((els) => els.map((el) => `${el.closest('th')?.textContent ?? ''}`));
    note(`Matrix-Zeilen: ${levels.join(' | ')}`);
    note(`Listeneinträge mit Hinweis „wenig zu bieten“: ${await page.getByTestId('place-little-to-offer').count()}`);
  },
};
