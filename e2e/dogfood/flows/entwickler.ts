import type { Flow } from '../types';

export const entwicklerFlow: Flow = {
  name: 'entwickler',
  mode: 'P',
  description:
    'Entwicklerseite (S11.8): über den Hinweisbalken erreichbar; KI-Prüfung mit einem Schalter aus- und wieder einschalten (simulierte KI: standardmäßig an, echte KI: standardmäßig aus); Suchgrenzen im lokalen Test.',
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
      'KI wieder einschalten',
      async () => {
        await page.getByTestId('ai-switch').click();
        await page.locator('[data-testid="ai-switch"][aria-checked="true"]').waitFor({ timeout: 10_000 });
      },
      { expectSelector: ['[data-testid="ai-switch"][aria-checked="true"]'] },
    );
  },
};
