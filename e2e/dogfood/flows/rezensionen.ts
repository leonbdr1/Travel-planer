import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

// Aufgabe F18: reviews in the local language. In Chania (Crete) one simulated
// house has mould complaints in Greek; the review check recognises "μούχλα"
// without translating and the list shows the warning in German.
export const rezensionenFlow: Flow = {
  name: 'rezensionen',
  mode: 'P',
  description: 'Rezensionen in der Landessprache: griechische Schimmel-Beschwerden in Chania erscheinen als deutscher Warnhinweis mit KI-Kennzeichnung.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Suche nur in Chania bis zum Ergebnis',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl, 'Chania');
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]+/, { timeout: 30_000 });
        await page.getByRole('heading', { name: 'Suche abgeschlossen' }).waitFor({ timeout: 90_000 });
        const warnings = await page.getByText(/Schimmel/).allInnerTexts();
        note(`Hinweise: ${warnings.join(' | ')}`);
      },
      { expectText: ['Chania', 'Schimmel'], expectSelector: ['[data-ai-provenance]'] },
    );
  },
};
