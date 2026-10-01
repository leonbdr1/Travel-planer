import type { Flow } from '../types';
import { pickWindow } from './helpers';

// Aufgabe F16: drive times in bands. Exact under 7 h, "ca. 8 h" up to 10 h,
// "über 10 h" / "über 20 h" beyond, and from 30 h a plane "Flug empfohlen"
// (a hint only). The drive-time select goes up to 30 hours.
export const fahrzeitFlow: Flow = {
  name: 'fahrzeit',
  mode: 'P',
  description: 'Fahrzeiten in groben Blöcken: genau unter 7 h, dann „ca. 8 h“, „über 10 h“, „über 20 h“; ab 30 h Flugzeug-Hinweis (nur Anzeige); Auswahl bis 30 Stunden.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Fahrzeit-Auswahl bis 30 Stunden',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('origin-input').fill('Münch');
        await page.getByRole('option', { name: /^München, Bayern, DE/ }).click();
        await pickWindow(page, '2026-10-01', '2026-10-12');
        const options = await page.locator('#max-drive option').allInnerTexts();
        note(`Optionen: ${options.join(', ')}`);
        if (!options.includes('bis 30 Stunden')) throw new Error('no 30 h option');
        await page.locator('#max-drive').selectOption('1800');
      },
      { expectText: ['Fahrzeit (Auto)'] },
    );
    await step(
      'Strand und Meer bis 30 h: Blöcke statt Minuten bei fernen Regionen',
      async () => {
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Strand und Meer' }).click();
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 60_000 });
        const reasons = await page.getByTestId('region-reason').allInnerTexts();
        note(reasons.join(' | '));
      },
      { expectText: ['über 10 h'] },
    );
    await step(
      'Eigener Ort Adeje (Teneriffa): über 30 h mit Flugzeug-Hinweis',
      async () => {
        await page.getByRole('button', { name: 'Zurück' }).first().click();
        await page.getByTestId('own-places-input').fill('Adeje');
        await page.getByRole('option', { name: /^Adeje/ }).first().click();
        await page.getByTestId('own-place-chip').filter({ hasText: 'über 30 h' }).waitFor({ timeout: 30_000 });
        await page.getByTestId('own-places-input').fill('Venedig');
        await page.getByRole('option', { name: /^Venedig/ }).first().click();
        await page.getByTestId('own-place-chip').nth(1).waitFor();
        const chips = await page.getByTestId('own-place-chip').allInnerTexts();
        note(`Chips: ${chips.join(' | ')}`);
      },
      { expectText: ['über 30 h', 'Flug empfohlen'], expectSelector: ['[data-testid="flight-badge"]'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step('Handy (390 px)', async () => page.getByTestId('own-place-chip').first().scrollIntoViewIfNeeded(), { expectText: ['Flug empfohlen'], fullPage: false });
  },
};
