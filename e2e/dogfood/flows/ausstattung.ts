import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

// Aufgabe 12: facilities arrive in English (like the real LiteAPI) and are
// shown in German, grouped with an icon per group.
export const ausstattungFlow: Flow = {
  name: 'ausstattung',
  mode: 'P',
  description: 'Detailansicht: Ausstattung auf Deutsch, nach Gruppen mit Symbol (Internet, Parken, Wellness, Draußen …); keine englischen Begriffe.',
  async run({ page, baseUrl, step }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Ausstattung in der Detailansicht',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl, 'Füssen');
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').getByTestId('result-name').first().click();
        await page.getByTestId('facilities').waitFor({ timeout: 30_000 });
        await page.getByTestId('facilities').scrollIntoViewIfNeeded();
      },
      {
        expectText: ['Ausstattung', 'Heizung', 'Internet'],
        expectSelector: ['[data-testid="facility-group"]'],
        rejectText: ['Free WiFi', 'Parking', 'Heating', 'Non-smoking', 'Tour desk', 'Pets allowed', 'Hiking', 'Terrace', 'Garden'],
        fullPage: false,
      },
    );
  },
};
