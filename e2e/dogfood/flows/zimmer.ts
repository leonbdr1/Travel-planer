import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe 5: rooms mapped to the party. One adult: family rooms and flats for
// four are more than needed; they are shown but kept out of the price
// formation, houses with nothing smaller are listed apart.
export const zimmerFlow: Flow = {
  name: 'zimmer',
  mode: 'P',
  description:
    'Zimmer und Personen: 1 Erwachsener, Füssen und Oberstdorf, Freitage im Oktober. Ferienwohnungen für 4 sind größer als nötig: unten unter „Nur größere Unterkünfte frei“, nicht in Liste und Matrix; Zimmerübersicht in der Detailansicht (passende zuerst, größere grau).',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Suche 1 Erwachsener, Füssen und Oberstdorf, 4 Freitage',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await pickWindow(page, '2026-10-01', '2026-10-26');
        await page.locator('#travellers').click();
        await page.getByTestId('count-adults').getByRole('button', { name: 'Erwachsene: eins weniger' }).click();
        await page.getByRole('button', { name: 'Fertig' }).click();
        for (const q of ['Füssen', 'Oberstdorf']) {
          await page.getByTestId('own-places-input').fill(q);
          await page.getByRole('option', { name: new RegExp(`^${q}`) }).first().click();
        }
        await page.getByTestId('frame-next').click();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('results').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 30_000 });
      },
      { expectText: ['8 von 8 Kombinationen', 'Nur größere Unterkünfte frei', 'größer als nötig – nicht im Preisvergleich'], fullPage: true },
    );
    const oversized = await page.getByTestId('oversized-list').locator('li').count().catch(() => 0);
    note(`Unterkünfte nur mit größeren Wohnungen: ${oversized}`);
    const listed = await page.getByTestId('result-list').getByTestId('result-name').allInnerTexts();
    note(`In der Liste (passende Zimmer): ${listed.join(', ')}`);
    await step(
      'Detailansicht eines Hotels mit Einzel- und Familienzimmer: Zimmerübersicht',
      async () => {
        await page.getByTestId('result-list').getByTestId('result-name').first().click();
        await page.getByTestId('detail-offers').first().waitFor({ timeout: 30_000 });
        await page.getByTestId('room-overview').scrollIntoViewIfNeeded();
      },
      { expectText: ['Zimmer an deinen Terminen (für 1 Person)', 'für bis zu'], expectSelector: ['[data-testid="room-overview"]'] },
    );
    note(`Zimmerübersicht: ${(await page.getByTestId('room-overview').innerText()).replace(/\n/g, ' | ')}`);
  },
};
