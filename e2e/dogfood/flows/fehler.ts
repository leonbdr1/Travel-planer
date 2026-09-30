import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

export const fehlerFlow: Flow = {
  name: 'fehler',
  mode: 'P',
  description:
    'Fehlerfälle (B6): falscher Link zur Suche, Unterkunft ohne Verbindung, Serverfehler mit Fehler-ID, Seitencode nicht ladbar (alte Version im Tab), unbekannte Seite – jeweils eine kurze deutsche Meldung statt Absturz.',
  async run({ page, baseUrl, step, note }) {
    let searchUrl = '';
    await step(
      'Suche Füssen als Ausgangspunkt',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').first().waitFor({ timeout: 90_000 });
        searchUrl = page.url();
      },
      { expectText: ['Alle Angebote'], fullPage: false },
    );

    await step(
      'Link mit falschem Schlüssel: „Diese Suche gibt es nicht“',
      async () => {
        await page.goto(searchUrl.replace(/#t=.*/, `#t=${'x'.repeat(43)}`));
        await page.getByText('Diese Suche gibt es nicht').waitFor({ timeout: 15_000 });
      },
      { expectText: ['Diese Suche gibt es nicht oder der Link ist ungültig.'], rejectText: ['Unexpected Application Error'], fullPage: false },
    );

    await step(
      'Unterkunft öffnen ohne Verbindung zur API: „Keine Verbindung“',
      async () => {
        await page.goto(searchUrl);
        await page.getByTestId('result-list').first().waitFor({ timeout: 30_000 });
        const href = (await page.getByTestId('result-name').first().getAttribute('href')) ?? '';
        await page.route('**/api/v1/searches/*/hotels/**', (route) => route.abort('internetdisconnected'));
        await page.goto(`${baseUrl}${href}`);
        await page.getByText('Keine Verbindung').waitFor({ timeout: 15_000 });
        await page.unroute('**/api/v1/searches/*/hotels/**');
      },
      { expectText: ['Keine Verbindung. Bitte prüfe dein Internet'], rejectText: ['Diese Suche gibt es nicht'], fullPage: false },
    );

    await step(
      'Serverfehler: Meldung mit Fehler-ID',
      async () => {
        await page.route('**/api/v1/searches/*/hotels/**', (route) =>
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            headers: { 'x-request-id': '3f2a9c1e-0000-4000-8000-000000000000' },
            body: JSON.stringify({ error: { code: 'internal', message: 'Interner Fehler. Bitte versuche es später erneut.' } }),
          }),
        );
        await page.reload();
        await page.getByText('Fehler-ID 3f2a9c1e').waitFor({ timeout: 15_000 });
        await page.unroute('**/api/v1/searches/*/hotels/**');
      },
      { expectText: ['Interner Fehler. Bitte versuche es später erneut. (Fehler-ID 3f2a9c1e)'], fullPage: false },
    );

    await step(
      'Seitencode nicht ladbar (alte Version im Tab): „Neue Version verfügbar“ mit „Neu laden“',
      async () => {
        await page.goto(searchUrl);
        await page.getByTestId('result-list').first().waitFor({ timeout: 30_000 });
        // Dev server: the page module; production build: its hashed chunk.
        await page.route(/\/(src\/pages\/HotelDetail\.tsx|assets\/HotelDetail-[^/]+\.js)/, (route) => route.abort('failed'));
        await page.getByTestId('result-name').first().click();
        await page.getByTestId('route-error').waitFor({ timeout: 15_000 });
        await page.unrouteAll();
        note(`Kopf und Fuß bleiben: ${(await page.getByTestId('site-footer').count()) === 1 ? 'ja' : 'nein'}`);
      },
      { expectText: ['Neue Version verfügbar', 'Neu laden', 'Zur Startseite'], expectSelector: ['[data-testid="site-footer"]'], rejectText: ['Unexpected Application Error'], fullPage: false },
    );

    await step(
      '„Neu laden“ öffnet die Unterkunft',
      async () => {
        await page.getByRole('button', { name: 'Neu laden' }).click();
        await page.getByTestId('detail-offers').waitFor({ timeout: 30_000 });
      },
      { expectText: ['Alle Termine und Tarife'], fullPage: false },
    );

    await step(
      'Unbekannte Seite',
      async () => {
        await page.goto(`${baseUrl}/gibt-es-nicht`);
        await page.getByText('Seite nicht gefunden').waitFor();
      },
      { expectText: ['Seite nicht gefunden', 'Zur Startseite'], fullPage: false },
    );
  },
};
