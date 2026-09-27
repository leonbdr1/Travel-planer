import type { Page } from '@playwright/test';
import type { Flow } from '../types';

const PAGES: Array<[string, string, string]> = [
  ['Impressum', 'Impressum', 'Anbieter (§ 5 DDG)'],
  ['AGB', 'Allgemeine Geschäftsbedingungen', 'Kein Widerrufsrecht'],
  ['Datenschutz', 'Datenschutzerklärung', 'Deine Rechte'],
  ['Kontakt', 'Kontakt', 'Wir antworten in der Regel innerhalb von'],
];

async function viaFooter(page: Page, from: string, link: string, heading: string) {
  await page.goto(from);
  await page.getByTestId('site-footer').getByRole('link', { name: link, exact: true }).click();
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 10_000 });
}

export const pflichtseitenFlow: Flow = {
  name: 'pflichtseiten',
  mode: 'R',
  description:
    "Pflicht- und Transparenzseiten (F14): Impressum, AGB, Datenschutz und Kontakt sind von Startseite, Suche und „So funktioniert's“ aus über die Fußzeile erreichbar; Platzhalter sind markiert; „So funktioniert's“ erklärt Datenquelle, Vermittlerrolle, Zahlung, Rangliste und KI-Einsatz mit den KI-Kennzeichnungen.",
  async run({ page, baseUrl, step, note }) {
    const origins = [`${baseUrl}/`, `${baseUrl}/suche`, `${baseUrl}/so-funktionierts`];
    for (const [link, heading, marker] of PAGES) {
      await step(
        `${heading} über die Fußzeile`,
        async () => {
          for (const origin of origins) await viaFooter(page, origin, link, heading);
          note(`${link} von ${origins.length} Seiten aus erreicht (Start, Suche, So funktioniert's).`);
        },
        { expectText: [heading, marker], expectSelector: ['[data-testid="legal-page"]'] },
      );
    }

    await step(
      "„So funktioniert's“ mit KI-Kennzeichnungen",
      async () => {
        await page.goto(`${baseUrl}/`);
        await page.getByTestId('site-footer').getByRole('link', { name: "So funktioniert's", exact: true }).click();
        await page.getByRole('heading', { level: 1, name: "So funktioniert's" }).waitFor();
        await page.locator('[data-ai-provenance]').first().waitFor({ timeout: 10_000 });
      },
      {
        expectText: ['Woher die Angebote kommen', 'Unsere Rolle', 'Zahlung', 'Rangliste', 'Einsatz von KI', 'GeoNames (CC BY 4.0)', 'OpenStreetMap', 'KI-gestützte Auswertung von Gästebewertungen'],
        expectSelector: ['[data-ai-provenance="ai_assisted"]'],
        rejectText: ['Platzhalter: Die endgültigen Rechtstexte'],
        fullPage: true,
      },
    );
  },
};
