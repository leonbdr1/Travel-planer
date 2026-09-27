import type { Page } from '@playwright/test';

/** Search frame Stuttgart, 01.–12.10.2026 (two Fridays), only one own place; stops at "Suche starten". */
export async function prepareSinglePlaceSearch(page: Page, baseUrl: string, place = 'Füssen') {
  await page.goto(`${baseUrl}/suche`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${baseUrl}/suche`);
  await page.getByTestId('origin-input').fill('Stutt');
  await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
  await page.locator('#window-start').fill('2026-10-01');
  await page.locator('#window-end').fill('2026-10-12');
  await page.locator('#nights').selectOption('2');
  await page.locator('#max-drive').selectOption('240');
  await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern' }).click();
  await page.getByTestId('date-count').filter({ hasText: '2 Termine' }).waitFor();
  await page.getByTestId('frame-next').click();
  await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
  await page.getByTestId('regions-next').click();
  await page.getByTestId('place-row').first().waitFor({ timeout: 30_000 });
  const rows = page.getByTestId('place-row');
  for (let i = 0; i < (await rows.count()); i += 1) {
    const box = rows.nth(i).locator('input[type="checkbox"]');
    if (await box.isChecked()) await box.uncheck();
  }
  await page.getByTestId('own-place-input').fill(place);
  await page.getByRole('option', { name: new RegExp(`^${place}`) }).first().click();
  await page.getByTestId('combination-count').filter({ hasText: '1 Ort × 2 Termine = 2 Kombinationen' }).waitFor();
  await page.getByTestId('places-confirm').click();
  await page.getByTestId('start-search').waitFor();
}
