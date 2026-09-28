import type { Flow } from '../types';

export const entwicklerFlow: Flow = {
  name: 'entwickler',
  mode: 'P',
  description:
    'Entwicklerseite (S11.8): über den Hinweisbalken erreichbar; KI-Prüfung mit einem Schalter aus- und wieder einschalten; bei ausgeschalteter KI ist das Freitextfeld der Suche ausgegraut (simulierte KI: standardmäßig an, echte KI: standardmäßig aus); Suchgrenzen im lokalen Test.',
  async run({ page, baseUrl, step, note }) {
    await step(
      'Entwicklerseite über den Hinweisbalken',
      async () => {
        await page.goto(`${baseUrl}/`);
        await page.getByTestId('dev-link').click();
        await page.getByTestId('ai-switch').waitFor({ timeout: 15_000 });
      },
      {
        expectText: ['Entwicklerseite', 'nie für Kunden', 'KI-Prüfung der Rezensionen', 'simuliert und kostet nichts', 'Suchgrenzen im Test', '60 Suchen pro Stunde, 200 pro Tag'],
        expectSelector: ['[data-testid="ai-switch"][aria-checked="true"]'],
      },
    );

    await step(
      'KI ausschalten: Hinweisbalken und Schalter zeigen „aus“',
      async () => {
        await page.getByTestId('ai-switch').click();
        await page.locator('[data-testid="ai-switch"][aria-checked="false"]').waitFor({ timeout: 10_000 });
        await page.reload();
        await page.locator('[data-testid="ai-switch"][aria-checked="false"]').waitFor({ timeout: 10_000 });
        note(`Zustand nach Neuladen: ${await page.getByTestId('ai-state').innerText()}`);
      },
      { expectText: ['aus', 'Gilt ab der nächsten Suche.'], expectSelector: ['[data-testid="ai-switch"][aria-checked="false"]'] },
    );

    await step(
      'Suche bei ausgeschalteter KI: Freitextfeld ausgegraut, Chips wählbar',
      async () => {
        await page.goto(`${baseUrl}/suche`);
        await page.getByTestId('wish-ai-off').waitFor({ timeout: 15_000 });
        if (!(await page.locator('#wish-text').isDisabled())) throw new Error('KI-Freitextfeld ist nicht gesperrt');
        if (!(await page.getByTestId('translate-wish').isDisabled())) throw new Error('Übersetzen-Knopf ist nicht gesperrt');
        await page.getByTestId('wish-chips').locator('button').first().click();
      },
      { expectText: ['KI ausgeschaltet (Entwicklerseite)'], expectSelector: ['#wish-text:disabled', '[data-testid="wish-chips"] [aria-pressed="true"]'] },
    );

    await step(
      'KI wieder einschalten',
      async () => {
        await page.goto(`${baseUrl}/entwickler`);
        await page.locator('[data-testid="ai-switch"][aria-checked="false"]').waitFor({ timeout: 15_000 });
        await page.getByTestId('ai-switch').click();
        await page.locator('[data-testid="ai-switch"][aria-checked="true"]').waitFor({ timeout: 10_000 });
      },
      { expectSelector: ['[data-testid="ai-switch"][aria-checked="true"]'] },
    );
  },
};
