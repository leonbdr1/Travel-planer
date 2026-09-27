import type { Flow } from '../types';
import { prepareSixtyCombinations } from './suche';

export const ergebnisseFlow: Flow = {
  name: 'ergebnisse',
  mode: 'P',
  description:
    'Ergebnisse (F5, F7, F9, F10, Akzeptanzbeispiel 1): Suche Stuttgart, 5 Orte × 9 Freitage; Matrix mit Farbstufen, Liste mit Schnäppchen-Begründung, Sortierung, Zellfilter, Filter ohne neue Suche, Detailansicht mit Score-Aufschlüsselung, Seite zur Rangliste.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suche 5 Orte × 9 Termine gestartet und abgeschlossen',
      async () => {
        await prepareSixtyCombinations(page, baseUrl, '2026-11-30', 9);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('results').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 30_000 });
      },
      {
        expectText: ['45 von 45 Kombinationen', 'Ergebnisse', 'Preise abgerufen um', 'Bestes Angebot', 'So berechnen wir die Rangliste', 'pro Nacht', 'Schnäppchen'],
        expectSelector: ['[data-testid="result-matrix"]', '[data-testid="bargain-reason"]', '[data-testid="result-filters"]'],
        fullPage: true,
      },
    );
    const cells = await page.locator('[data-testid="result-matrix"] td[data-state]').count();
    const hrefs = await page.getByTestId('result-name').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    if (new Set(hrefs).size !== hrefs.length) throw new Error('result list shows a hotel more than once');
    note(`Matrix mit ${cells} Zellen; Liste mit ${hrefs.length} Einträgen, jede Unterkunft genau einmal (${new Set(hrefs).size} verschiedene Unterkünfte).`);

    await step(
      'Sortierung nach Preis',
      async () => {
        await page.getByTestId('sort').getByRole('radio', { name: 'Preis' }).click();
        await page.getByTestId('sort').getByRole('radio', { name: 'Preis', checked: true }).waitFor();
        await page.waitForTimeout(800);
      },
      { expectSelector: ['[data-testid="sort"] [aria-checked="true"]'] },
    );

    await step(
      'Klick auf eine Matrix-Zelle filtert die Liste',
      async () => {
        await page.locator('[data-testid="result-matrix"] td[data-state="offer"] button').first().click();
        await page.getByTestId('cell-filter').waitFor();
        await page.waitForTimeout(800);
      },
      { expectText: ['Nur ', 'Alle Orte und Termine zeigen'], expectSelector: ['[data-testid="result-list"]'] },
    );
    await page.getByRole('button', { name: 'Alle Orte und Termine zeigen' }).click();

    const countsBefore = await page.getByTestId('results-counts').innerText();
    await step(
      'Filter ohne neue Suche: Budget 200 € lässt einen Teil übrig',
      async () => {
        await page.locator('#f-budget').fill('200');
        await page.getByTestId('apply-filters').click();
        await page.waitForFunction(
          (before) => document.querySelector('[data-testid="results-counts"]')?.textContent !== before,
          countsBefore,
          { timeout: 15_000 },
        );
        await page.getByTestId('result-list').waitFor();
        const totals = (await page.getByTestId('result-total').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-total-eur')))));
        const over = totals.filter((v) => v > 200);
        if (totals.length === 0 || over.length > 0) throw new Error(`budget filter: ${totals.length} results, ${over.length} above 200 €`);
        note(`Budget 200 €: ${await page.getByTestId('results-counts').innerText()} (vorher: ${countsBefore}); alle ${totals.length} angezeigten Gesamtpreise ≤ 200 €.`);
      },
      { expectSelector: ['[data-testid="result-total"]'] },
    );

    await step(
      'Filter ohne neue Suche: Budget 50 €',
      async () => {
        await page.locator('#f-budget').fill('50');
        await page.getByTestId('apply-filters').click();
        await page.getByText('Keine Unterkunft erfüllt diese Filter').waitFor({ timeout: 15_000 });
      },
      { expectText: ['Keine Unterkunft erfüllt diese Filter'] },
    );
    await page.getByRole('button', { name: 'Filter der Suche' }).click();
    await page.getByTestId('result-list').waitFor();

    await step(
      'Detailansicht mit allen Terminen und Score-Aufschlüsselung',
      async () => {
        await page.getByTestId('result-name').first().click();
        await page.getByTestId('detail-offers').waitFor({ timeout: 15_000 });
      },
      {
        expectText: ['Alle Termine und Tarife', 'So setzt sich der Qualitätswert zusammen', 'Aktualität nicht geprüft', 'Rezensionscheck', 'Buchen'],
        expectSelector: ['[data-testid="score-breakdown"]', '[data-testid="book-offer"]'],
        fullPage: true,
      },
    );

    await step(
      'Vergleichspreis auf Abruf',
      async () => {
        const buttons = page.getByTestId('reference-show');
        const count = Math.min(await buttons.count(), 3);
        for (let i = 0; i < count; i += 1) await buttons.first().click();
        await page.getByTestId('reference-price').first().waitFor({ timeout: 15_000 });
        await page.waitForTimeout(500);
        const texts = await page.getByTestId('reference-price').allInnerTexts();
        note(`Vergleichspreise für ${texts.length} Termine: ${texts.map((x) => x.split('\n')[0]).join(' | ')}`);
      },
      { expectSelector: ['[data-testid="reference-price"]'], rejectText: ['Bestpreis', 'spare', 'günstiger als bei'] },
    );

    await step(
      'Seite „So berechnen wir die Rangliste“',
      async () => {
        await page.goto(`${baseUrl}/ranking`);
        await page.getByRole('heading', { name: 'So berechnen wir die Rangliste' }).waitFor();
      },
      { expectText: ['Qualitätswert', 'Preis', 'Schnäppchen', 'Provisionen oder Margen haben keinen Einfluss'] },
    );
  },
};
