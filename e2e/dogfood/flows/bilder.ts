import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

// Aufgabe 11: photos in the detail view open large in a lightbox with
// previous/next, arrow keys, counter and thumbnails.
export const bilderFlow: Flow = {
  name: 'bilder',
  mode: 'P',
  description: 'Detailansicht: Klick auf ein Foto öffnet es groß, mit Vor/Zurück, Pfeiltasten, Zähler und Vorschaubildern; Escape schließt.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Detailansicht mit Fotos',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl, 'Füssen');
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').getByTestId('result-name').first().click();
        await page.getByTestId('detail-photos').waitFor({ timeout: 30_000 });
      },
      { expectSelector: ['[data-testid="detail-photo"]'], fullPage: false },
    );
    await step(
      'Klick auf das erste Foto: groß',
      async () => {
        await page.getByTestId('detail-photo').first().click();
        await page.getByTestId('lightbox-image').waitFor();
      },
      { expectSelector: ['[data-testid="lightbox"]', '[data-testid="lightbox-next"]'], expectText: ['1 /'], fullPage: false },
    );
    await step(
      'Weiter mit dem Pfeil-Knopf und der Pfeiltaste',
      async () => {
        await page.getByTestId('lightbox-next').click();
        await page.getByTestId('lightbox-counter').filter({ hasText: /^2 \// }).waitFor();
        await page.keyboard.press('ArrowLeft');
        await page.getByTestId('lightbox-counter').filter({ hasText: /^1 \// }).waitFor();
        await page.keyboard.press('ArrowLeft');
        note(`Nach „zurück“ vom ersten Foto: ${await page.getByTestId('lightbox-counter').innerText()} (springt ans Ende)`);
      },
      { expectSelector: ['[data-testid="lightbox-image"]'], fullPage: false },
    );
    await step(
      'Escape schließt',
      async () => {
        await page.keyboard.press('Escape');
        await page.getByTestId('lightbox').waitFor({ state: 'detached' });
      },
      { expectSelector: ['[data-testid="detail-photos"]'], fullPage: false },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step(
      'Handy: Foto groß',
      async () => {
        await page.getByTestId('detail-photo').nth(1).click();
        await page.getByTestId('lightbox-image').waitFor();
      },
      { expectText: ['2 /'], fullPage: false },
    );
  },
};
