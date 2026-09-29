import { hotelsAt } from '@reiseplaner/providers';
import type { Flow } from '../types';

// Füssen as the own place of the search; the simulated LiteAPI answers per place.
const FUESSEN = { lat: 47.57143, lng: 10.70171 };

export const warnungenFlow: Flow = {
  name: 'warnungen',
  mode: 'P',
  description:
    'Rezensionscheck (F8, Akzeptanzbeispiel 4): Suche Stuttgart → Füssen × 2 Freitage; die Rezensionen der wahrscheinlichen Finalisten werden geprüft. „Hotel Schwanen“ (Schimmel) ist seit dem 28.09. aus Liste und Matrix aussortiert („mit Warnsignalen“); seine Detailansicht zeigt „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“ mit KI-Kennzeichnung; Warnhinweise anderer Häuser stehen mit KI-Kennzeichnung in der Liste; eine geprüfte Unterkunft ohne Treffer zeigt „keine Auffälligkeiten“.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suchrahmen gesetzt und eigener Ort Füssen gewählt',
      async () => {
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
        await page.getByTestId('own-place-input').fill('Füssen');
        await page.getByRole('option', { name: /^Füssen/ }).first().click();
        await page.getByTestId('combination-count').filter({ hasText: '1 Ort × 2 Termine = 2 Kombinationen' }).waitFor();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').waitFor();
      },
      { expectText: ['1 Ort × 2 Termine = 2 Kombinationen', 'Suche starten'] },
    );

    await step(
      'Suche mit Rezensionscheck abgeschlossen',
      async () => {
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        const reviewing = await page
          .getByTestId('reviewing')
          .waitFor({ timeout: 20_000 })
          .then(() => true)
          .catch(() => false);
        note(reviewing ? 'Zwischenstand „Rezensionen werden geprüft“ war sichtbar.' : 'Der Rezensionscheck war zu schnell für den Zwischenstand.');
        await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
      },
      { expectText: ['Suche abgeschlossen', '2 von 2 Kombinationen', 'Alle Angebote'], expectSelector: ['[data-testid="result-warnings"]'] },
    );

    await step(
      'Liste: „Hotel Schwanen“ (Schimmel) aussortiert, andere Warnhinweise mit KI-Kennzeichnung',
      async () => {
        const names = await page.getByTestId('result-list').getByTestId('result-name').allInnerTexts();
        if (names.includes('Hotel Schwanen')) throw new Error('Hotel Schwanen with mould is in the list');
        await page.getByTestId('excluded').locator('summary').click();
        const reasons = await page.getByTestId('excluded').locator('li').allInnerTexts();
        await page.getByTestId('result-warnings').first().scrollIntoViewIfNeeded();
        const withWarnings = await page.getByTestId('result-warnings').count();
        const noIssues = await page.getByTestId('result-review-ok').count();
        note(`Aussortiert: ${reasons.join(' | ')}`);
        note(`Liste: ${names.length} Unterkünfte, ${withWarnings} davon mit Warnhinweisen, ${noIssues} geprüft ohne Auffälligkeiten; „Hotel Schwanen“ nicht dabei.`);
      },
      {
        expectText: ['mit Warnsignalen: Gäste berichten von Schimmel', 'KI-gestützte Auswertung von Gästebewertungen'],
        expectSelector: ['[data-testid="excluded"] li[data-reason="red_flag"]', '[data-testid="result-warnings"] [data-ai-provenance="ai_assisted"]', '[data-testid="result-review-ok"]'],
      },
    );

    await step(
      'Detailansicht „Hotel Schwanen“: Schimmel 3 von 3 in den letzten 6 Monaten, KI-gestützt (Akzeptanzbeispiel 4)',
      async () => {
        // Sorted out, so not linked from the list: open its page of this search directly.
        const schwanen = hotelsAt(FUESSEN.lat, FUESSEN.lng).find((h) => h.name === 'Hotel Schwanen');
        if (!schwanen) throw new Error('Hotel Schwanen not in the simulated world at Füssen');
        const current = new URL(page.url());
        await page.goto(`${baseUrl}${current.pathname}/unterkunft/${encodeURIComponent(schwanen.id)}${current.hash}`);
        await page.getByTestId('review-check').waitFor({ timeout: 15_000 });
        await page.getByTestId('review-check').scrollIntoViewIfNeeded();
      },
      {
        expectText: [
          'Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten',
          'KI-gestützte Auswertung von Gästebewertungen',
          'erheblich',
          'Bewertungen geprüft am',
          'Abzüge aus Warnhinweisen',
        ],
        expectSelector: ['[data-testid="review-check"] [data-ai-provenance="ai_assisted"]', '[data-testid="warning"][data-verified="true"]'],
        rejectText: ['Hinweis (ungeprüft)'],
        fullPage: true,
      },
    );

    await step(
      'Geprüfte Unterkunft ohne Auffälligkeiten',
      async () => {
        await page.goBack();
        await page.getByTestId('result-list').waitFor({ timeout: 15_000 });
        const clean = page.getByTestId('result-list').locator('li').filter({ has: page.getByTestId('result-review-ok') }).first();
        await clean.getByTestId('result-name').click();
        await page.getByTestId('review-no-issues').waitFor({ timeout: 15_000 });
        await page.getByTestId('review-check').scrollIntoViewIfNeeded();
      },
      { expectText: ['Keine Auffälligkeiten in den geprüften Rezensionen', 'Bewertungen geprüft am'], expectSelector: ['[data-testid="review-no-issues"]'] },
    );
  },
};
