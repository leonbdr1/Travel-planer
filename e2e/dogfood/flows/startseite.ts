import type { Flow } from '../types';

// Aufgabe 1: calendar in the style of booking sites; arrival and departure with
// two clicks in one popover. The home page has one button to the search; the
// frame (where, when, who) is filled in on /suche.
export const startseiteFlow: Flow = {
  name: 'startseite',
  mode: 'P',
  description:
    'Startseite mit einem Button „Suche starten“; auf der Suchseite „Wohin soll es gehen?“ oben (Vorschläge ab Startort und/oder eigene Orte), darunter verbunden die Leiste mit Kalender (zwei Klicks: Anreise, dann Abreise) und Reisenden im Aufklappfeld.',
  async run({ page, baseUrl, step, note }) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await step(
      'Startseite: nur ein Button, keine Eingabefelder',
      async () => {
        await page.goto(`${baseUrl}/`);
        await page.evaluate(() => sessionStorage.clear());
        await page.goto(`${baseUrl}/`);
        await page.getByTestId('hero-search').waitFor();
      },
      { expectText: ['Suche starten', 'Flexibel reisen, besser wohnen.'], rejectText: ['Anreise frühestens', 'Fahrzeit (Auto)'], expectSelector: ['[data-testid="hero-search"]'] },
    );
    await step(
      'Klick auf „Suche starten“: oben „Wohin soll es gehen?“, darunter verbunden Datum und Reisende',
      async () => {
        await page.getByTestId('hero-search').click();
        await page.getByTestId('where').waitFor();
        await page.getByTestId('search-bar').waitFor();
      },
      {
        expectText: ['Wohin soll es gehen?', 'Orte vorschlagen lassen', 'Orte selbst wählen', 'Startort', 'Fahrzeit (Auto)', 'Wann und mit wem?', 'Anreise frühestens', 'Abreise spätestens', '2 Erwachsene · 1 Zimmer'],
        expectSelector: ['[data-testid="where"] [data-testid="search-bar"]', '[data-testid="way-suggest"] [data-testid="origin-fields"]'],
      },
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
      'Klick auf Anreise öffnet den Kalender mit zwei Monaten',
      async () => {
        await page.locator('#window-start').click();
        await page.getByTestId('calendar').waitFor();
        while ((await page.locator('[data-testid="calendar"] [data-date="2026-10-02"]:visible').count()) === 0) {
          await page.getByTestId('calendar-next').click();
        }
      },
      { expectText: ['Wann kannst du frühestens anreisen?', 'Oktober 2026'], expectSelector: ['#window-start[aria-expanded="true"]'] },
    );
    await step(
      'Erster Klick: Anreise 02.10. – der Kalender springt auf die Abreise',
      async () => {
        await page.locator('[data-testid="calendar"] [data-date="2026-10-02"]:visible').click();
        await page.getByTestId('calendar-hint').filter({ hasText: 'spätestens zurück' }).waitFor();
        await page.locator('[data-testid="calendar"] [data-date="2026-10-25"]:visible').hover();
      },
      {
        expectText: ['Und wann musst du spätestens zurück sein?', 'Fr, 02.10.2026', '23 Tage Zeitraum'],
        expectSelector: ['#window-end[aria-expanded="true"]'],
      },
    );
    await step(
      'Zweiter Klick: Abreise 25.10. – der Kalender schließt sich',
      async () => {
        await page.locator('[data-testid="calendar"] [data-date="2026-10-25"]:visible').click();
        await page.getByTestId('calendar').waitFor({ state: 'detached' });
      },
      { expectText: ['Fr, 02.10.2026', 'So, 25.10.2026'], expectSelector: ['#window-end[data-value="2026-10-25"]'] },
    );
    await step(
      'Reisende: 1 Kind dazu',
      async () => {
        await page.locator('#travellers').click();
        await page.getByTestId('count-children').getByRole('button', { name: 'Kinder: eins mehr' }).click();
      },
      { expectText: ['2 Erwachsene · 1 Kind · 1 Zimmer', 'Alter Kind 1', 'Fertig'] },
    );
    await page.getByRole('button', { name: 'Fertig' }).click();
    await step(
      'Terminvorschau und Startort passen zu den Angaben',
      async () => {
        await page.getByTestId('date-count').filter({ hasText: 'Termine' }).waitFor();
      },
      {
        expectText: ['Schritt 1 von 3', 'Fr, 02.10.2026', 'So, 25.10.2026', '2 Erwachsene · 1 Kind · 1 Zimmer', 'Daraus entstehen 4 Termine'],
        expectSelector: ['[data-origin="2825297"]'],
        fullPage: true,
      },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await step(
      'Handy (390 px): Kalender mit einem Monat',
      async () => {
        await page.locator('#window-start').click();
        await page.getByTestId('calendar').waitFor();
      },
      { expectText: ['Wann kannst du frühestens anreisen?'] },
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    note(`Querscrollen auf 390 px: ${overflow > 0 ? `${overflow} px` : 'keines'}`);
  },
};
