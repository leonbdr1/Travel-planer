import type { Page } from '@playwright/test';
import type { Flow } from '../types';

/** Wizard step 1: Stuttgart, Fridays from 1 October, 2 nights, hiking; optionally a goal (its button label). */
export async function fillSearchFrame(page: Page, baseUrl: string, windowEnd: string, dates: number, goal?: string) {
  await page.goto(`${baseUrl}/suche`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${baseUrl}/suche`);
  await page.getByTestId('origin-input').fill('Stutt');
  await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
  await page.locator('#window-start').fill('2026-10-01');
  await page.locator('#window-end').fill(windowEnd);
  await page.locator('#nights').selectOption('2');
  await page.locator('#max-drive').selectOption('180');
  await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern' }).click();
  await page.getByTestId('date-count').filter({ hasText: `${dates} Termine` }).waitFor();
  if (goal) await page.getByTestId('goal-switch').getByRole('radio', { name: goal }).click();
}

/** Wizard steps 1–3 for 5 places × n Fridays (12 by default: 60 combinations). */
export async function prepareSixtyCombinations(page: Page, baseUrl: string, windowEnd = '2026-12-20', dates = 12) {
  await fillSearchFrame(page, baseUrl, windowEnd, dates);
  await choosePlaces(page, dates);
}

/** Wizard steps 2–3 from a filled frame: the first 5 suggested places, confirmed. */
export async function choosePlaces(page: Page, dates: number) {
  await page.getByTestId('frame-next').click();
  await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
  await page.getByTestId('regions-next').click();
  await page.getByTestId('place-row').first().waitFor({ timeout: 30_000 });
  const rows = page.getByTestId('place-row');
  const count = await rows.count();
  for (let i = 5; i < count; i += 1) {
    const box = rows.nth(i).locator('input[type="checkbox"]');
    if (await box.isChecked()) await box.uncheck();
  }
  await page.getByTestId('combination-count').filter({ hasText: `5 Orte × ${dates} Termine = ${5 * dates} Kombinationen` }).waitFor();
  await page.getByTestId('places-confirm').click();
  await page.getByTestId('start-search').waitFor();
}

export const sucheFlow: Flow = {
  name: 'suche',
  mode: 'P',
  description:
    'Kombinationssuche (F4): 5 Orte × 12 Termine, Start mit ALTCHA im Browser, Fortschritt „x von 60“, Matrix füllt sich live, Hinweis bei Teilergebnissen.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Ortsliste bestätigt: 60 Kombinationen',
      async () => {
        await prepareSixtyCombinations(page, baseUrl);
      },
      { expectText: ['Ortsliste bestätigt', '5 Orte × 12 Termine = 60 Kombinationen', 'Suche starten', 'Rechenaufgabe'] },
    );

    await step(
      'Suche gestartet: Fortschritt und Matrix mit Platzhaltern',
      async () => {
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('matrix').waitFor();
      },
      { expectText: ['Kombinationen', 'Preis-Matrix'], expectSelector: ['[data-testid="matrix"]', '[role="progressbar"]'] },
    );

    await step(
      'Suche abgeschlossen: 60 von 60, Matrix gefüllt',
      async () => {
        await page.getByTestId('search-progress').filter({ hasText: '60 von 60 Kombinationen' }).waitFor({ timeout: 90_000 });
        const offers = await page.locator('[data-testid="matrix"] td[data-state="offer"]').count();
        const noData = await page.locator('[data-testid="matrix"] td[data-state="failed"]').count();
        note(`Matrix: ${offers} Zellen mit Angebot, ${noData} ohne Daten.`);
      },
      {
        expectText: ['60 von 60 Kombinationen', 'Angebote', 'ab '],
        expectSelector: ['[data-testid="matrix"] td[data-state="offer"]'],
        rejectText: ['wird gesucht'],
        fullPage: true,
      },
    );
  },
};
