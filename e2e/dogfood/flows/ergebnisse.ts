import type { Flow } from '../types';
import { prepareSixtyCombinations } from './suche';

export const ergebnisseFlow: Flow = {
  name: 'ergebnisse',
  mode: 'P',
  description:
    'Ergebnisse (F5, F7, F9, F10, Akzeptanzbeispiel 1): Suche Stuttgart, 5 Orte × 9 Freitage; Matrix mit Farbstufen und Hinweis beim Draufhalten (Unterkunft, Zimmer, Schnäppchen-Begründung), Liste mit Schnäppchen-Begründung, Sortierung, Zellfilter, Filter ohne neue Suche, aussortierte Unterkünfte ohne Bewertungen unten, Detailansicht mit Score-Aufschlüsselung und lesbaren deutschen Texten, Seite zur Rangliste.',
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
        expectText: ['45 von 45 Kombinationen', 'Deine Auswahl', 'Alle Angebote', 'Preise von', 'Unsere Wahl zuerst', 'So berechnen wir die Rangliste', 'pro Nacht', 'Schnäppchen', 'dasselbe Zimmer'],
        expectSelector: ['[data-testid="result-matrix"]', '[data-testid="bargain-reason"]', '[data-testid="result-filters"]'],
        fullPage: true,
      },
    );

    await step(
      'Maus auf einen ★-Preis der Matrix: Unterkunft, Zimmer und Begründung',
      async () => {
        const cell = page.locator('[data-testid="result-matrix"] td[data-bargain] button').first();
        await cell.scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, -200);
        await cell.hover();
        const tip = page.getByTestId('tooltip');
        await tip.waitFor({ timeout: 5_000 });
        note(`Hinweis beim Draufhalten: ${(await tip.innerText()).replace(/\n/g, ' | ')}`);
        note(`Beschriftung für Screenreader: ${await cell.getAttribute('aria-label')}`);
      },
      {
        expectText: ['günstiger als dieselbe Unterkunft an deinen anderen Terminen (gleiches Zimmer: hier', 'pro Nacht', 'Klick: nur diese Kombination'],
        expectSelector: ['[data-testid="tooltip"] [data-testid="matrix-bargain-reason"]'],
        fullPage: false,
      },
    );
    await page.mouse.move(0, 0);
    const cells = await page.locator('[data-testid="result-matrix"] td[data-state]').count();
    const hrefs = await page.getByTestId('result-name').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    if (new Set(hrefs).size !== hrefs.length) throw new Error('result list shows a hotel more than once');
    note(`Matrix mit ${cells} Zellen; Liste mit ${hrefs.length} Einträgen, jede Unterkunft genau einmal (${new Set(hrefs).size} verschiedene Unterkünfte).`);

    await step(
      'Sortierung „Unsere Wahl zuerst“ (Standard: Preis)',
      async () => {
        const totals = await page.getByTestId('result-list').getByTestId('result-total').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-total-eur'))));
        if (totals.some((v, i) => i > 0 && v < (totals[i - 1] ?? 0))) throw new Error(`default order is not by price: ${totals.join(', ')}`);
        await page.getByTestId('sort').getByRole('radio', { name: 'Unsere Wahl zuerst' }).click();
        await page.getByTestId('sort').getByRole('radio', { name: 'Unsere Wahl zuerst', checked: true }).waitFor();
        await page.waitForTimeout(800);
        const first = page.getByTestId('result-list').locator('li').first();
        note(`Standard nach Preis: ${totals.length} Unterkünfte, aufsteigend. Oben bei „Unsere Wahl zuerst“: ${await first.getByTestId('result-name').innerText()}.`);
      },
      { expectSelector: ['[data-testid="sort"] [aria-checked="true"]', '[data-testid="result-list"] li:first-child [data-testid="recommended"]'] },
    );
    await page.getByTestId('sort').getByRole('radio', { name: 'Preis' }).click();
    await page.getByTestId('sort').getByRole('radio', { name: 'Preis', checked: true }).waitFor();

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
      'Aussortierte Unterkünfte ohne Bewertungen stehen unten, mit Grund',
      async () => {
        const section = page.getByTestId('unrated-section');
        await section.scrollIntoViewIfNeeded();
        const names = await section.getByTestId('result-name').allInnerTexts();
        const doubts = await section.getByTestId('unrated-doubt').allInnerTexts();
        note(`${names.length} Unterkünfte ohne Bewertungen unten: ${names.map((n, i) => `${n} („${doubts[i] ?? ''}“)`).join(' | ')}`);
        note(`Zähler: ${await page.getByTestId('results-counts').innerText()}`);
        if ((await section.getByTestId('recommended').count()) > 0) throw new Error('a house without reviews is marked as recommendation');
      },
      {
        expectText: ['Ohne Bewertungen, nicht in unserer Auswahl', 'nicht zwingend schlecht', 'noch keine Bewertungen'],
        expectSelector: ['[data-testid="unrated-section"] [data-testid="unrated-doubt"]'],
        fullPage: false,
      },
    );

    await step(
      'Fusionierte Note nennt ihre Quelle in Liste und Detailansicht',
      async () => {
        const item = page.getByTestId('result-list').locator('li').filter({ has: page.getByTestId('rating-sources') }).first();
        await item.scrollIntoViewIfNeeded();
        note(`Liste: ${(await item.getByTestId('rating-sources').innerText()).trim()}`);
        await item.getByTestId('result-name').click();
        await page.getByTestId('rating-sources-note').waitFor({ timeout: 15_000 });
        note(`Detail: ${(await page.getByTestId('rating-sources-note').innerText()).trim()}`);
      },
      {
        expectText: ['inkl. Tripadvisor', 'Bewertungen von Tripadvisor zusammen', 'zählen dabei halb'],
        expectSelector: ['[data-testid="rating-sources"]', '[data-testid="rating-sources-note"]'],
      },
    );
    await page.goBack();
    await page.getByTestId('result-list').waitFor();

    await step(
      'Detailansicht mit allen Terminen und Score-Aufschlüsselung',
      async () => {
        // The review check covers the likely finalists of every goal (architektur.md 6.15),
        // not every house of the list: open the first checked one.
        const checked = page
          .getByTestId('result-list')
          .locator('li')
          .filter({ has: page.locator('[data-testid="result-review-ok"], [data-testid="result-warnings"]') })
          .first();
        await checked.getByTestId('result-name').click();
        await page.getByTestId('detail-offers').waitFor({ timeout: 15_000 });
      },
      {
        expectText: ['Alle Termine und Tarife', 'So setzt sich der Qualitätswert zusammen', 'Aktualität', 'Rezensionscheck', 'Bewertungen geprüft am', 'Buchen', 'Beschreibung', 'Wichtige Hinweise der Unterkunft', 'Junggesellenabschiede'],
        expectSelector: ['[data-testid="score-breakdown"]', '[data-testid="book-offer"]', '[data-testid="hotel-description"] h3', '[data-testid="important-information"]'],
        // Provider markup never shows, and the texts came in German.
        rejectText: ['<p>', '<strong>', '&amp;', 'This property', 'nur auf Englisch'],
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
      {
        expectText: ['Qualitätswert', 'Preis', 'Unsere Wahl', 'Schnäppchen (★)', 'dasselbe Zimmer', 'Durchschnittspreis an deinen anderen Terminen', 'ganz unten', 'Provisionen oder Margen haben keinen Einfluss'],
        rejectText: ['Wir empfehlen keinen Favoriten', 'gegenüber dem Durchschnitt aller Treffer', 'Rangwert'],
      },
    );
  },
};
