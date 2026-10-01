import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

// Aufgabe 7: guest rating and our score side by side, the "i" explains the
// difference for this house; the same in the detail view.
export const bewertungFlow: Flow = {
  name: 'bewertung',
  mode: 'P',
  description:
    'Gästebewertung und unser Wert nebeneinander in Liste, Auswahl und Detailansicht; das „i“ erklärt beim Draufhalten, warum sich die Werte bei dieser Unterkunft unterscheiden, mit Link zur Rechenweise.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Suche Füssen, Liste mit beiden Werten',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl, 'Füssen');
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
      },
      { expectText: ['Gästebewertungen', 'Unser Wert'], expectSelector: ['[data-testid="rating-pair"] [data-testid="guest-rating"]', '[data-testid="rating-pair"] [data-testid="our-rating"]'] },
    );
    const pairs = await page.getByTestId('result-list').getByTestId('rating-pair').evaluateAll((els) =>
      els.map((el) => `${el.getAttribute('data-guest')} → ${el.getAttribute('data-ours')}`),
    );
    note(`Gäste → unser Wert in der Liste: ${pairs.join(', ')}`);
    await step(
      'Maus auf das „i“ neben „Unser Wert“ einer Unterkunft mit Unterschied',
      async () => {
        const differing = page
          .getByTestId('result-list')
          .getByTestId('rating-pair')
          .filter({ has: page.locator('[data-testid="rating-info"]') });
        const count = await differing.count();
        let target = differing.first();
        for (let i = 0; i < count; i += 1) {
          const el = differing.nth(i);
          if ((await el.getAttribute('data-guest')) !== (await el.getAttribute('data-ours'))) {
            target = el;
            break;
          }
        }
        await target.scrollIntoViewIfNeeded();
        await target.getByTestId('rating-info').hover();
        await page.getByTestId('rating-info-panel').first().waitFor();
        note(`Erklärung: ${(await page.getByTestId('rating-info-panel').first().innerText()).replace(/\n/g, ' | ')}`);
      },
      { expectText: ['Die Gästebewertung ist der reine Durchschnitt', 'So berechnen wir unseren Wert'], expectSelector: ['[data-testid="rating-info-panel"] a[href="/ranking"]'] },
    );
    await page.mouse.move(0, 0);
    await step(
      'Detailansicht: beide Werte oben, Aufschlüsselung mit Art der Unterkunft',
      async () => {
        await page.getByTestId('result-list').getByTestId('result-name').first().click();
        await page.getByTestId('score-breakdown').waitFor({ timeout: 30_000 });
      },
      { expectText: ['Unser Wert', 'Gästebewertungen', 'Unser Qualitätswert'], expectSelector: ['[data-testid="rating-pair"]'] },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step(
      'Handy: Tippen auf das „i“',
      async () => {
        await page.getByTestId('rating-info').first().click();
        await page.getByTestId('rating-info-panel').first().waitFor();
        const box = await page.getByTestId('rating-info-panel').first().boundingBox();
        note(`Erklärung auf 390 px: links ${Math.round(box?.x ?? 0)} px, rechts ${Math.round((box?.x ?? 0) + (box?.width ?? 0))} px`);
      },
      { expectText: ['So berechnen wir unseren Wert'] },
    );
  },
};
