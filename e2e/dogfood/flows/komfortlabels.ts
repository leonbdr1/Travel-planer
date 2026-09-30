import type { Flow } from '../types';
import { choosePlaces, fillSearchFrame } from './suche';

// Aufgabe F20 (Ben, 30.09.): Pool, Klimaanlage and Meerblick are wish chips at
// the bottom of the search frame (they filter hard) and positive labels on
// every house that has them; the finale also shows the walk to the beach.
export const komfortlabelsFlow: Flow = {
  name: 'komfortlabels',
  mode: 'P',
  description: 'Wünsche Pool, Klimaanlage, Meerblick als Chips (filtern hart) und als positive Labels ohne Chip; Strand in Gehminuten in der Preisleiter.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suchrahmen: die drei neuen Wünsche unten bei den Chips',
      async () => {
        await fillSearchFrame(page, baseUrl, '2026-10-20', 3);
        const chips = await page.getByTestId('wish-chips').allInnerTexts();
        note(`Wünsche: ${chips.join(' ').replace(/\n/g, ' ')}`);
        for (const name of ['Pool', 'Klimaanlage', 'Meerblick']) {
          if (!(await page.getByTestId('wish-chips').getByRole('button', { name, exact: true }).count())) throw new Error(`chip ${name} missing`);
        }
        await page.getByTestId('wish-chips').scrollIntoViewIfNeeded();
      },
      { expectText: ['Pool', 'Klimaanlage', 'Meerblick', 'Besonders sauber', 'Barrierefrei'] },
    );
    await step(
      'Ohne Häkchen: Häuser mit Pool, Klima oder Meerblick zeigen es als Label, Strand in Gehminuten',
      async () => {
        await choosePlaces(page, 3);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('finalist').first().waitFor({ timeout: 90_000 });
        const codes = await page.locator('[data-testid="feature-badge"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-code') ?? ''));
        const has = (c: string) => codes.filter((x) => x === c).length;
        note(`Badges in der Preisleiter: Klima ${has('klimaanlage')}, Meerblick ${has('meerblick')}, Pool ${has('schwimmbad')}, Strand ${has('lage_strand')}.`);
        if (has('klimaanlage') + has('meerblick') + has('schwimmbad') === 0) throw new Error('no comfort label at all');
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.getByTestId('finalists').scrollIntoViewIfNeeded();
      },
      { expectSelector: ['[data-testid="feature-badge"]'], fullPage: false },
    );
  },
};
