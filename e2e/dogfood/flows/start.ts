import type { Flow } from '../types';

export const startFlow: Flow = {
  name: 'start',
  mode: 'R',
  description: 'Erster Besuch der Startseite: Die Statuszeile belegt den Pfad Browser → Worker → Datenbank.',
  async run({ page, baseUrl, step }) {
    await step(
      'Startseite',
      async () => {
        await page.goto(`${baseUrl}/`);
        await page.getByTestId('status-line').filter({ hasText: 'Datenbank: ok' }).waitFor({ timeout: 20_000 });
      },
      {
        expectText: ['API: ok · Datenbank: ok', 'Suchen', 'Impressum', 'Datenschutz', 'AGB', 'Kontakt'],
        expectSelector: ['[data-testid="site-footer"]', '[data-testid="attribution"]'],
      },
    );
  },
};
