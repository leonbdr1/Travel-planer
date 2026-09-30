import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F20: Europe as a whole. A destination country ("Spanien") narrows
// the suggestions; any small place can be picked as an own place and searched,
// with or without a catalog entry.
export const reiselandFlow: Flow = {
  name: 'reiseland',
  mode: 'P',
  description: 'Reiseland wählen (Spanien, Strand, Flug), dann einen kleinen Ort ohne Katalogeintrag (Vimeiro, Portugal) suchen.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Flug, Strand und Meer, Reiseland Spanien',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Münch');
        await page.getByRole('option', { name: /^München, Bayern, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.getByTestId('country-fields').locator('summary').click();
        await page.getByTestId('country-chips').getByRole('button', { name: 'Spanien' }).click();
        const summary = await page.getByTestId('country-summary').innerText();
        if (summary !== 'Spanien') throw new Error(`summary shows "${summary}"`);
        await page.getByTestId('mode-flight').click();
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Strand und Meer' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const titles = await page.getByTestId('region-card').locator('h3').allInnerTexts();
        note(`Regionen: ${titles.join(', ')}`);
        const spanish = /Barcelona|Palma|Ibiza|Costa|Valencia|Andalusien|Kanar|San Sebasti|Menorca|Madrid|Málaga/;
        if (titles.length < 4 || !titles.every((t) => spanish.test(t))) throw new Error(`not only Spain: ${titles.join(', ')}`);
      },
      { expectText: ['Passende Regionen', 'Strand und Meer'], expectSelector: ['[data-testid="region-card"]'] },
    );
    await step(
      'Zurück: die Auswahl steht noch, Land abwählen und Portugal wählen',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        const summary = await page.getByTestId('country-summary').innerText();
        if (summary !== 'Spanien') throw new Error(`selection lost: "${summary}"`);
        await page.getByTestId('country-chips').getByRole('button', { name: 'Spanien' }).click();
        await page.getByTestId('country-chips').getByRole('button', { name: 'Portugal' }).click();
        note(`Reiseland: ${await page.getByTestId('country-summary').innerText()}`);
      },
      { expectText: ['Reiseland', 'Portugal'] },
    );
    await step(
      'Kleiner Ort ohne Katalog: Vimeiro als eigener Ort, nur diesen Ort suchen',
      async () => {
        await page.getByTestId('toggle-own').check();
        await page.getByTestId('own-places-input').fill('Vimeiro');
        await page.getByRole('option', { name: /^Vimeiro/ }).first().click();
        await page.getByTestId('own-place-chip').first().waitFor();
        await page.getByTestId('toggle-suggest').uncheck();
        await page.locator('#nights').selectOption('2');
      },
      { expectText: ['Vimeiro'] },
    );
    await step(
      'Suche über Vimeiro bis zum Ergebnis',
      async () => {
        await page.getByTestId('frame-next').click();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]+/, { timeout: 30_000 });
        await page.getByRole('heading', { name: 'Suche abgeschlossen' }).waitFor({ timeout: 90_000 });
      },
      { expectText: ['Vimeiro', 'Suche abgeschlossen'] },
    );
  },
};
