import type { Flow } from '../types';
import { prepareSinglePlaceSearch } from './helpers';

export const buchungFlow: Flow = {
  name: 'buchung',
  mode: 'P',
  description:
    'Buchung (F11–F13, Akzeptanzbeispiel 5): Suche Füssen × 2 Freitage → Detailansicht → Buchungsformular mit Pflicht-Bestätigungen → simulierte Zahlung (Fake-Modus) → Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer → Buchungsansicht → Stornierung mit Kostenvorschau → Zugangslink unter „Meine Buchung“.',
  async run({ page, baseUrl, step, note }) {
    let bookingRef = '';
    await step(
      'Suche abgeschlossen, Detailansicht geöffnet',
      async () => {
        await prepareSinglePlaceSearch(page, baseUrl);
        await page.getByTestId('start-search').click();
        await page.waitForURL(/\/suche\/[0-9a-f-]{36}#t=/, { timeout: 30_000 });
        await page.getByTestId('result-list').waitFor({ timeout: 90_000 });
        await page.getByTestId('result-name').first().click();
        await page.getByTestId('detail-offers').waitFor({ timeout: 15_000 });
      },
      { expectText: ['Alle Termine und Tarife', 'Buchen'], expectSelector: ['[data-testid="book-offer"]'] },
    );

    await step(
      'Buchungsformular mit Angebot, Pflicht-Bestätigungen und Hinweis auf Beträge vor Ort',
      async () => {
        await page.getByTestId('book-offer').first().click();
        await page.getByTestId('booking-form').waitFor({ timeout: 15_000 });
        await page.locator('#holder-first').fill('Erika');
        await page.locator('#holder-last').fill('Mustermann');
        await page.locator('#holder-email').fill('erika@example.org');
        await page.getByTestId('accept-terms').check();
        await page.getByTestId('accept-no-withdrawal').check();
      },
      {
        expectText: ['Dein Angebot', 'Gesamtpreis', 'Deine Angaben', 'Gäste je Zimmer', 'Vertragspartner für den Aufenthalt ist die Unterkunft', 'kein Widerrufsrecht', 'Weiter zur Zahlung'],
        expectSelector: ['[data-testid="booking-summary"]', '[data-testid="guest-row"]'],
        fullPage: true,
      },
    );

    await step(
      'Angebot reserviert, Zahlungsseite (simuliert)',
      async () => {
        await page.getByTestId('booking-submit').click();
        const which = await Promise.race([
          page.getByTestId('payment').waitFor({ timeout: 30_000 }).then(() => 'payment'),
          page.getByTestId('price-confirm').waitFor({ timeout: 30_000 }).then(() => 'price'),
        ]);
        if (which === 'price') {
          note('Der Preis hatte sich geändert; der neue Preis wurde im Dialog bestätigt.');
          await page.getByTestId('price-confirm').click();
          await page.getByTestId('payment').waitFor({ timeout: 30_000 });
        } else {
          note('Preis unverändert, direkt zur Zahlung.');
        }
        bookingRef = /\/buchung\/([0-9A-Z]{8})\/zahlung/.exec(page.url())?.[1] ?? '';
      },
      { expectText: ['Zahlung', 'Simulierte Zahlung (Entwicklungsmodus)', 'Testzahlung abschließen', 'wir sehen keine Kartendaten'] },
    );

    await step(
      'Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer',
      async () => {
        await page.getByTestId('simulated-pay').click();
        await page.getByTestId('booking-confirmed').waitFor({ timeout: 30_000 });
        const ref = await page.getByTestId('booking-ref').innerText();
        const hcn = await page.getByTestId('hotel-confirmation').innerText();
        if (ref !== bookingRef || !/^HCN-\d{6}$/.test(hcn)) throw new Error(`unexpected confirmation: ${ref} / ${hcn}`);
        note(`Buchungsnummer ${ref}, Bestätigungsnummer der Unterkunft ${hcn}.`);
      },
      {
        expectText: ['Buchung bestätigt', 'BUCHUNGSNUMMER', 'BESTÄTIGUNGSNUMMER DER UNTERKUNFT', 'HCN-', 'Vertragspartner für den Aufenthalt ist', 'e***@example.org'],
        expectSelector: ['[data-testid="booking-ref"]', '[data-testid="hotel-confirmation"]', '[data-testid="view-booking"]'],
        fullPage: true,
      },
    );

    await step(
      'Buchungsansicht mit Stornierung und Kostenvorschau',
      async () => {
        await page.getByTestId('view-booking').click();
        await page.getByTestId('booking-view').waitFor({ timeout: 15_000 });
        await page.getByTestId('cancel-booking').click();
        await page.getByTestId('cancel-preview').waitFor({ timeout: 15_000 });
      },
      { expectText: ['Deine Buchung', 'bestätigt', 'Buchung stornieren?', 'Die Stornierung ist jetzt kostenlos'], expectSelector: ['[data-testid="cancel-confirm"]'] },
    );

    await step(
      'Buchung storniert',
      async () => {
        await page.getByTestId('cancel-confirm').click();
        await page.getByTestId('cancelled-note').waitFor({ timeout: 15_000 });
      },
      { expectText: ['storniert', 'Stornogebühr 0,00', 'Erstattung'], expectSelector: ['[data-testid="cancelled-note"]'] },
    );

    await step(
      '„Meine Buchung“: Zugangslink anfordern',
      async () => {
        await page.goto(`${baseUrl}/buchung`);
        await page.locator('#my-ref').fill(bookingRef.toLowerCase());
        await page.locator('#my-email').fill('erika@example.org');
        await page.getByTestId('access-link-submit').click();
        await page.getByTestId('access-link-sent').waitFor({ timeout: 30_000 });
      },
      { expectText: ['Meine Buchung', 'Wenn die Angaben zu einer Buchung passen'] },
    );
  },
};
