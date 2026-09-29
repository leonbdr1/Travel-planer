import { hotelsAt } from '@reiseplaner/providers';
import type { Flow } from '../types';

// Own places of the search; the simulated LiteAPI answers per place.
const HOEFEN = { lat: 47.46667, lng: 10.68333 };

// Höfen (Tirol) has a small house with three mould reports among 38 guests
// (about 12 % of its checked reviews, recent ones counting double): out of
// hand, sorted out. Füssen and Höfen have houses with the same three reports
// among 100 checked reviews (about 4 %): listed like any other (Ben, 2026-09-29).
const OUT_OF_HAND = (() => {
  const house = hotelsAt(HOEFEN.lat, HOEFEN.lng).find((h) => h.issue === 'mold' && h.reviewCount < 40);
  if (!house) throw new Error('no small mould house in the simulated world at Höfen');
  return house.name;
})();

export const warnungenFlow: Flow = {
  name: 'warnungen',
  mode: 'P',
  description:
    'Rezensionscheck (F8, Akzeptanzbeispiel 4) und Warnsignale nach Anteil (Ben, 29.09.): Suche Stuttgart → Füssen und Höfen (Tirol) × 2 Freitage; die Rezensionen der wahrscheinlichen Finalisten werden geprüft. Häuser mit 3 Schimmel-Meldungen bei 100 geprüften Bewertungen stehen ganz normal in der Liste, mit Warnhinweis und KI-Kennzeichnung; die Detailansicht zeigt „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“. Ein kleines Haus in Höfen mit denselben 3 Meldungen bei 38 Gästen ist aussortiert („Beschwerden … häufen sich“). Eine geprüfte Unterkunft ohne Treffer zeigt „keine Auffälligkeiten“.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suchrahmen gesetzt, eigene Orte Füssen und Höfen gewählt',
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
        for (const name of ['Füssen', 'Höfen']) {
          await page.getByTestId('own-place-input').fill(name);
          await page.getByRole('option', { name: new RegExp(`^${name}`) }).first().click();
        }
        await page.getByTestId('combination-count').filter({ hasText: '2 Orte × 2 Termine = 4 Kombinationen' }).waitFor();
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('start-search').waitFor();
      },
      { expectText: ['2 Orte × 2 Termine = 4 Kombinationen', 'Suche starten'] },
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
      { expectText: ['Suche abgeschlossen', '4 von 4 Kombinationen', 'Alle Angebote'], expectSelector: ['[data-testid="result-warnings"]'] },
    );

    let fewReports = '';
    await step(
      `Liste: Häuser mit wenigen Schimmel-Meldungen normal gelistet, „${OUT_OF_HAND}“ (3 bei 38 Gästen) aussortiert`,
      async () => {
        const names = await page.getByTestId('result-list').getByTestId('result-name').allInnerTexts();
        if (names.includes(OUT_OF_HAND)) throw new Error(`${OUT_OF_HAND} with mould out of hand is in the list`);
        const items = page.getByTestId('result-list').locator('li').filter({ has: page.getByTestId('result-warnings').filter({ hasText: 'Schimmel' }) });
        const withMould = await items.getByTestId('result-name').allInnerTexts();
        if (withMould.length === 0) throw new Error('no house with a few mould reports in the list');
        fewReports = withMould[0] ?? '';
        await page.getByTestId('excluded').locator('summary').click();
        const reasons = await page.getByTestId('excluded').locator('li').allInnerTexts();
        await items.first().scrollIntoViewIfNeeded();
        const warning = (await items.first().getByTestId('result-warnings').innerText()).replace(/\s+/g, ' ').trim();
        note(`Aussortiert: ${reasons.join(' | ')}`);
        note(`Liste: ${names.length} Unterkünfte; mit Schimmel-Hinweis normal gelistet: ${withMould.map((n) => `„${n}“ (Platz ${names.indexOf(n) + 1})`).join(', ')}; „${fewReports}“ zeigt „${warning}“; „${OUT_OF_HAND}“ nicht dabei.`);
      },
      {
        expectText: ['mit Warnsignalen: Beschwerden über Schimmel, Ungeziefer oder Schmutz häufen sich', 'KI-gestützte Auswertung von Gästebewertungen'],
        expectSelector: ['[data-testid="excluded"] li[data-reason="red_flag"]', '[data-testid="result-warnings"] [data-ai-provenance="ai_assisted"]', '[data-testid="result-review-ok"]'],
      },
    );

    await step(
      'Detailansicht des Hauses mit wenigen Schimmel-Meldungen: 3 in den letzten 6 Monaten, KI-gestützt (Akzeptanzbeispiel 4)',
      async () => {
        await page.getByTestId('result-list').getByTestId('result-name').getByText(fewReports, { exact: true }).first().click();
        await page.getByTestId('review-check').waitFor({ timeout: 15_000 });
        await page.getByTestId('review-check').scrollIntoViewIfNeeded();
        note(`Detailansicht „${fewReports}“.`);
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
