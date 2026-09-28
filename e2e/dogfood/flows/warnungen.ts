import type { Flow } from '../types';

export const warnungenFlow: Flow = {
  name: 'warnungen',
  mode: 'P',
  description:
    'Rezensionscheck (F8, Akzeptanzbeispiel 4): Suche Stuttgart → Füssen × 2 Freitage; die Rezensionen der Top 10 werden geprüft. „Hotel Schwanen“ zeigt in Liste und Detailansicht „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“ mit KI-Kennzeichnung; eine geprüfte Unterkunft ohne Treffer zeigt „keine Auffälligkeiten“.',
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

    const schwanen = page.getByTestId('result-list').locator('li').filter({ has: page.getByTestId('result-name').filter({ hasText: 'Hotel Schwanen' }) });
    await step(
      'Liste: Warnhinweis mit KI-Kennzeichnung',
      async () => {
        await schwanen.getByTestId('result-warnings').scrollIntoViewIfNeeded();
        const text = await schwanen.getByTestId('result-warnings').innerText();
        if (!text.includes('Schimmel: 3 (3 in 6 Mon.)')) throw new Error(`unexpected warnings: ${text}`);
        const withWarnings = await page.getByTestId('result-warnings').count();
        const noIssues = await page.getByTestId('result-review-ok').count();
        note(`Liste: ${withWarnings} Unterkünfte mit Warnhinweisen, ${noIssues} geprüft ohne Auffälligkeiten.`);
      },
      {
        expectText: ['Schimmel: 3 (3 in 6 Mon.)', 'KI-gestützte Auswertung von Gästebewertungen'],
        expectSelector: ['[data-testid="result-warnings"] [data-ai-provenance="ai_assisted"]', '[data-testid="result-review-ok"]'],
      },
    );

    await step(
      'Detailansicht: Schimmel 3 von 3 in den letzten 6 Monaten, KI-gestützt',
      async () => {
        await schwanen.getByTestId('result-name').click();
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
