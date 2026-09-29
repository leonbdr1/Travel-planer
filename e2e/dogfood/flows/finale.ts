import type { Flow } from '../types';
import { choosePlaces, fillSearchFrame } from './suche';

export const finaleFlow: Flow = {
  name: 'finale',
  mode: 'P',
  description:
    'Entscheidungshilfe (F15–F17, konzept.md 9.9–9.11): Ziel „Günstig und sauber“ im Suchformular, Suche Stuttgart → 5 Orte × 3 Freitage; oben „Deine Auswahl“ als Preisleiter mit höchstens 5 Unterkünften, die günstigste zuerst, bei den anderen Aufpreis und Badges (Legende: grün zusätzlich, weiß gleich, durchgestrichen fehlt, gelb Lob, grau Kritik), Gehminuten aus OpenStreetMap, „Unsere Wahl“ markiert; aussortierte Unterkünfte mit Gründen; Zielwechsel ohne neue Suche; Lob-Labels in Liste und Detailansicht; Sterne und Mindestbewertung unter „Weitere Filter“.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suchformular: Ziel „Günstig und sauber“ mit einem Tipp',
      async () => {
        await fillSearchFrame(page, baseUrl, '2026-10-20', 3, 'Günstig und sauber');
        await page.getByTestId('goal').scrollIntoViewIfNeeded();
      },
      {
        expectText: ['Worauf legst du Wert?', 'Günstig und sauber', 'Preis-Leistung', 'Komfort', 'Der Preis zählt am meisten, Sauberkeit ist Pflicht.', 'Weitere Filter'],
        expectSelector: ['[data-testid="goal-switch"] [aria-checked="true"][data-goal="sparen"]'],
        // The old form fields are gone (their labels were "Mindestens Sterne" and "Mindeststandard").
        rejectText: ['Mindestens Sterne', 'Mindeststandard'],
      },
    );

    await step(
      'Suche abgeschlossen: „Deine Auswahl“ steht oben',
      async () => {
        await choosePlaces(page, 3);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('finalist').first().waitFor({ timeout: 90_000 });
        await page.locator('[data-testid="finale"][data-goal="sparen"]').waitFor();
        const totals = await page.getByTestId('finalist-total').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-total-eur'))));
        const sorted = totals.every((v, i) => i === 0 || v >= (totals[i - 1] ?? 0));
        if (totals.length === 0 || totals.length > 5 || !sorted) throw new Error(`finalists: ${totals.join(', ')}`);
        const surcharges = await page.getByTestId('surcharge').evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-delta-eur'))));
        const expected = totals.slice(1).map((v) => Math.round((v - (totals[0] ?? 0)) * 100) / 100);
        if (surcharges.map((v) => Math.round(v * 100) / 100).join() !== expected.join()) throw new Error(`surcharges ${surcharges.join()} ≠ ${expected.join()}`);
        note(`${totals.length} Finalisten, Gesamtpreise ${totals.join(' € · ')} €; Aufpreise ${surcharges.map((v) => `+${v} €`).join(', ') || 'keine'}.`);
      },
      {
        expectText: ['Deine Auswahl', 'Wir haben aussortiert', 'günstigste', 'aussortiert', 'Legende', 'zusätzlich', 'fehlt', 'Lob und Kritik stammen aus Bewertungen von Gästen', 'Unsere Wahl', 'Alle Angebote'],
        expectSelector: ['[data-testid="finalist"]', '[data-testid="excluded"]', '[data-testid="feature-badge"]', '[data-testid="finale-legend"]'],
        rejectText: ['Unsere Empfehlung', 'Testsieger'],
        fullPage: true,
      },
    );

    await step(
      'Aussortiert, mit Grund und Anzahl',
      async () => {
        await page.getByTestId('excluded').locator('summary').click();
        const reasons = await page.getByTestId('excluded').locator('li').allInnerTexts();
        if (reasons.length === 0) throw new Error('no exclusion reasons');
        note(`Gründe: ${reasons.join(' | ')}`);
      },
      { expectText: ['zu teuer für dein Ziel'], expectSelector: ['[data-testid="excluded"] li[data-reason]'] },
    );

    await step(
      'Preisleiter: Aufpreis und Badges statt Sätzen, Gehminuten aus OpenStreetMap',
      async () => {
        await page.getByTestId('finalists').scrollIntoViewIfNeeded();
        const rows = await page.getByTestId('finalist').evaluateAll((els) =>
          els.map((el) => {
            const name = el.querySelector('[data-testid="finalist-name"]')?.textContent ?? '';
            const delta = el.querySelector('[data-testid="surcharge"]')?.textContent ?? 'günstigste';
            const badges = Array.from(el.querySelectorAll('[data-testid="feature-badge"]')).map((b) => `${b.getAttribute('data-kind') === 'plus' ? '+' : b.getAttribute('data-kind') === 'minus' ? '−' : ''}${b.textContent}`);
            return `${name} (${delta}): ${badges.join(', ')}`;
          }),
        );
        note(`Leiter: ${rows.join(' || ')}`);
        const walk = await page.locator('[data-testid="feature-badge"][data-code^="lage_"]').count();
        if (walk === 0) throw new Error('no location badges');
      },
      {
        expectText: ['min', 'Kartendaten © OpenStreetMap-Mitwirkende'],
        expectSelector: ['[data-testid="feature-badge"][data-code^="lage_"]', '[data-testid="osm-attribution"]'],
        rejectText: ['Dafür nicht:', 'gegenüber'],
      },
    );

    await step(
      'Legende unter der Auswahl (Aufgabe 10)',
      async () => {
        await page.getByTestId('finale-legend').scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 250);
      },
      { expectText: ['Verglichen mit der günstigsten Unterkunft', 'Aus Gästebewertungen', 'Lob', 'Kritik'], fullPage: false },
    );

    await step(
      'Infofeld „i“ neben „Unser Wert“ wird in der Auswahl nicht abgeschnitten',
      async () => {
        await page.getByTestId('finalists').scrollIntoViewIfNeeded();
        const last = page.getByTestId('finalist').last().getByTestId('rating-info');
        await last.hover();
        const panel = page.getByTestId('finalist').last().getByTestId('rating-info-panel');
        await panel.waitFor();
        // Fully visible: the topmost element at the panel's corners and centre is the panel itself.
        const clipped = await panel.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const points: Array<[number, number]> = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]];
          return points.filter(([x, y]) => !el.contains(document.elementFromPoint(x, y))).length;
        });
        if (clipped > 0) throw new Error(`the info panel is cut off at ${clipped} of 5 points`);
        note('Infofeld vollständig sichtbar (5 Prüfpunkte).');
      },
      { expectSelector: ['[data-testid="rating-info-panel"]'], fullPage: false },
    );
    await page.mouse.move(0, 0);
    await page.getByTestId('rating-info-panel').waitFor({ state: 'detached' });

    await step(
      'Preisleiter auf dem Handy (390 px)',
      async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId('finale').scrollIntoViewIfNeeded();
        // The finale itself must fit; wide tables further down scroll inside their own box.
        const wide = await page.getByTestId('finale').evaluate((root) =>
          Array.from(root.querySelectorAll('*'))
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
            .slice(0, 3)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(el.getBoundingClientRect().right)}px`),
        );
        if (wide.length > 0) throw new Error(`finale wider than the screen: ${wide.join(' | ')}`);
        const pageWide = await page.evaluate(() =>
          Array.from(document.querySelectorAll('body *'))
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('table'))
            .slice(0, 3)
            .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('data-testid') ?? ''}].${String(el.className).slice(0, 50)}`),
        );
        // Tables (price matrix) scroll inside their own box; everything else fits.
        const outside = pageWide.filter((w) => !w.startsWith('thead') && !w.startsWith('tbody') && !w.startsWith('tr') && !w.startsWith('th') && !w.startsWith('td'));
        if (outside.length > 0) throw new Error(`wider than the screen: ${outside.join(' | ')}`);
      },
      { expectSelector: ['[data-testid="finalist"] [data-testid="feature-badge"]'] },
    );
    await page.setViewportSize({ width: 1280, height: 900 });

    await step(
      'Zielwechsel ohne neue Suche: „Komfort“',
      async () => {
        await page.getByTestId('finale').getByTestId('goal-switch').getByRole('radio', { name: 'Komfort' }).click();
        await page.locator('[data-testid="finale"][data-goal="komfort"]').waitFor({ timeout: 15_000 });
        await page.getByTestId('finale').scrollIntoViewIfNeeded();
        const names = await page.getByTestId('finalist-name').allInnerTexts();
        note(`Komfort-Finalisten: ${names.join(', ')}`);
      },
      {
        expectText: ['Qualität zählt mehr als der Preis.'],
        expectSelector: ['[data-testid="finale"][data-goal="komfort"] [data-testid="finalist"]'],
      },
    );

    await step(
      'Lob-Labels erscheinen von selbst in der Liste',
      async () => {
        await page.getByTestId('result-list').scrollIntoViewIfNeeded();
        const labels = await page.getByTestId('result-list').getByTestId('praise-label').allInnerTexts();
        if (labels.length === 0) throw new Error('no praise labels in the list');
        note(`Labels in der Liste: ${[...new Set(labels)].join(', ')} (${labels.length} insgesamt).`);
      },
      { expectSelector: ['[data-testid="result-list"] [data-testid="praise-label"]'] },
    );

    await step(
      'Detailansicht: „Was Gäste loben“ mit Zahlen',
      async () => {
        const item = page.getByTestId('result-list').locator('li').filter({ has: page.getByTestId('praise-label') }).first();
        await item.getByTestId('result-name').click();
        await page.getByTestId('praise').waitFor({ timeout: 15_000 });
        await page.getByTestId('praise').scrollIntoViewIfNeeded();
        note(`Detail: ${(await page.getByTestId('praise-count').allInnerTexts()).join(' | ')}`);
      },
      {
        expectText: ['Was Gäste loben', '× gelobt', '× kritisiert', 'ohne KI'],
        expectSelector: ['[data-testid="praise"] [data-testid="praise-label"]', '[data-testid="praise-count"]'],
        fullPage: true,
      },
    );

    await step(
      'Sterne und Mindestbewertung unter „Weitere Filter“',
      async () => {
        await page.goBack();
        await page.getByTestId('result-filters').waitFor({ timeout: 15_000 });
        await page.getByTestId('more-filters').locator('summary').click();
        await page.getByTestId('more-filters').scrollIntoViewIfNeeded();
      },
      { expectText: ['Weitere Filter: Sterne und Bewertungen', 'Sterne ab', 'Bewertung ab', 'Sterne sagen wenig über Sauberkeit und Zustand.'] },
    );
  },
};
