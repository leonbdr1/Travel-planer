import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F19: the further away, the better the suggestions; car or plane
// switch, continents to tick, flight time optional. Flights are only shown.
export const flugzeugFlow: Flow = {
  name: 'flugzeug',
  mode: 'P',
  description: 'Vorschläge nach Entfernung: Wandern nah dran offen, Strand weit weg nur Hotspots; Schalter Auto/Flugzeug, Kontinente, Flugzeit optional.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Wandern bis 3 Stunden: viele Vorschläge',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Münch');
        await page.getByRole('option', { name: /^München, Bayern, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        await page.locator('#max-drive').selectOption('180');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern', exact: true }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const n = await page.getByTestId('region-card').count();
        note(`${n} Regionen`);
        if (n < 6) throw new Error(`only ${n} regions for hiking`);
      },
      { expectText: ['Passende Regionen'] },
    );
    await step(
      'Strand und Meer bis 20 Stunden: nur bekannte Hotspots',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.locator('#max-drive').selectOption('1200');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern', exact: true }).click();
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Strand und Meer' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const titles = await page.getByTestId('region-card').allInnerTexts();
        note(titles.map((t) => t.split('\n')[0]).join(' | '));
      },
      { expectText: ['Top-Urlaubsort'] },
    );
    await step(
      'Schalter Flugzeug: Kontinente und optionale Flugzeit',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('mode-flight').click();
        await page.getByTestId('flight-fields').waitFor();
        const chips = await page.getByTestId('continent-chips').allInnerTexts();
        note(`Kontinente: ${chips.join(' ').replace(/\n/g, ' ')}`);
        if (await page.locator('#max-drive').count()) throw new Error('drive time still shown in flight mode');
      },
      { expectText: ['Flugzeug', 'Europa', 'Flugzeit (optional)'], expectSelector: ['[data-testid="continent-chips"]'] },
    );
    await step(
      'Flug nach Europa, Strand: Top-Ziele mit Flugzeit',
      async () => {
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const reasons = await page.getByTestId('region-reason').allInnerTexts();
        note(reasons.join(' | '));
        if (!reasons.every((r) => /Flug$/.test(r))) throw new Error('reason without flight time');
      },
      { expectText: ['Flug', 'Top-Urlaubsort'] },
    );
    await step(
      'Orte der Flugregion zeigen die Flugzeit',
      async () => {
        // The first region is ticked in advance.
        await page.getByTestId('regions-next').click();
        await page.getByTestId('place-row').first().waitFor({ timeout: 60_000 });
        const drive = await page.getByTestId('place-drive').first().innerText();
        note(drive);
        if (!/Flugzeit/.test(drive)) throw new Error('place without flight time');
      },
      { expectText: ['Flugzeit'] },
    );
    await step(
      'Flug nach Asien: leere Liste mit Hinweis',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('continent-chips').getByRole('button', { name: 'Europa' }).click();
        await page.getByTestId('continent-chips').getByRole('button', { name: 'Asien' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByText('nur Ziele in Europa').waitFor({ timeout: 60_000 });
      },
      { expectText: ['nur Ziele in Europa'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step(
      'Handy (390 px)',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('flight-fields').scrollIntoViewIfNeeded();
      },
      { expectText: ['Flugzeug'], fullPage: false },
    );
  },
};
