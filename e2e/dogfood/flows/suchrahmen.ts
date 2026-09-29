import type { Flow } from '../types';
import { pickWindow } from './helpers';

export const suchrahmenFlow: Flow = {
  name: 'suchrahmen',
  mode: 'P',
  description:
    'Assistent Schritt 1 bis 3 (F1–F3): Startort per Autovervollständigung, Zeitfenster mit Live-Terminanzahl, Freitext per KI in Chips, Regionsvorschläge mit Begründung, Ortsliste mit Fahrzeiten, eigener Ort, Bestätigung.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Suchrahmen öffnen',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.getByRole('heading', { name: 'Deine Suche' }).waitFor();
      },
      { expectText: ['Schritt', 'Suchrahmen', 'Regionen', 'Orte', 'Startort', 'Reiseart', 'Anreise frühestens', 'Abreise spätestens'] },
    );

    await step(
      'Startort „Stutt“ → Stuttgart',
      async () => {
        await page.getByTestId('origin-input').fill('Stutt');
        await page.getByRole('option', { name: /^Stuttgart, Baden-Württemberg, DE/ }).click();
      },
      { expectSelector: ['[data-origin="2825297"]'] },
    );

    await step(
      'Zeitfenster 01.10.–30.11.2026, 2 Nächte, Anreise Freitag, Wandern',
      async () => {
        await pickWindow(page, '2026-10-01', '2026-11-30');
        await page.locator('#nights').selectOption('2');
        await page.locator('#max-drive').selectOption('180');
        await page.getByTestId('theme-chips').getByRole('button', { name: 'Wandern' }).click();
        await page.getByTestId('date-count').filter({ hasText: '9 Termine' }).waitFor();
      },
      { expectText: ['9 Termine', '02.10.', 'Fr'] },
    );

    await step(
      'Zu viele Termine → verständliche Meldung',
      async () => {
        await page.getByTestId('weekday-chips').getByRole('button', { name: 'Sa' }).click();
        await page.getByTestId('weekday-chips').getByRole('button', { name: 'So' }).click();
        await page.getByTestId('date-count').filter({ hasText: 'Termine. Möglich sind höchstens 12' }).waitFor();
        note('Mit Fr, Sa und So entstehen zu viele Termine; danach wieder nur Freitag.');
      },
      { expectText: ['Möglich sind höchstens 12'] },
    );
    await page.getByTestId('weekday-chips').getByRole('button', { name: 'Sa' }).click();
    await page.getByTestId('weekday-chips').getByRole('button', { name: 'So' }).click();

    await step(
      'Freitext per KI in Chips übersetzen',
      async () => {
        await page.locator('#wish-text').fill('sauber, ruhig und Blick auf den See');
        await page.getByTestId('translate-wish').click();
        await page.getByTestId('unmatched').waitFor();
      },
      {
        expectText: ['Nicht zugeordnet:', '„Blick auf den See“', 'Deine Eingabe wird per KI in Auswahl-Chips übersetzt'],
        expectSelector: [
          '[data-ai-provenance]',
          '[data-testid="wish-chips"] button[aria-pressed="true"]:has-text("Besonders sauber")',
          '[data-testid="wish-chips"] button[aria-pressed="true"]:has-text("Ruhig")',
        ],
        fullPage: true,
      },
    );

    await step(
      'Regionsvorschläge mit Begründung',
      async () => {
        await page.getByTestId('frame-next').click();
        await page.getByTestId('region-card').first().waitFor({ timeout: 30_000 });
      },
      {
        expectText: ['Passende Regionen', 'passende Orte für Wandern', 'Fahrt', 'Weiter zu den Orten'],
        expectSelector: ['[data-testid="region-card"]', '[data-ai-provenance]'],
        fullPage: true,
      },
    );
    const regionCount = await page.getByTestId('region-card').count();
    note(`${regionCount} Regionen vorgeschlagen.`);

    await step(
      'Ortsliste mit Fahrzeiten',
      async () => {
        await page.getByTestId('regions-next').click();
        await page.getByTestId('place-row').first().waitFor({ timeout: 30_000 });
      },
      { expectText: ['Orte für deine Suche', 'Fahrzeit', 'von 10 Orten ausgewählt', 'Kombinationen'], fullPage: true },
    );

    await step(
      'Eigenen Ort hinzufügen (Tübingen)',
      async () => {
        await page.getByTestId('own-place-input').fill('Tübingen');
        await page.getByRole('option', { name: /Tübingen/ }).first().click();
        await page.getByText('Eigener Ort').first().waitFor();
      },
      { expectText: ['Tübingen', 'Eigener Ort'] },
    );

    await step(
      'Ortsliste bestätigen',
      async () => {
        await page.getByTestId('places-confirm').click();
        await page.getByTestId('places-confirmed').waitFor();
      },
      { expectText: ['Ortsliste bestätigt', 'Kombinationen'] },
    );
  },
};
