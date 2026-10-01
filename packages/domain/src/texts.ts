// German text templates produced by the domain (reasons, durations). They
// are checked by `npm run check:claims` like the UI texts.
import { formatDriveRange, formatDuration } from './drive-bands';
import { formatFlightRange } from './destinations';

export { formatDuration };

/** "Wandern", "Wandern und Seen", "Wandern, Seen und Wellness". */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;
}

/** Region reason (architektur.md 6.2 point 7): "{n} passende Orte für {Themen}, {min}–{max} Fahrt". */
export function regionReason(args: { places: number; themeLabels: readonly string[]; minMinutes: number; maxMinutes: number; estimated: boolean; mode?: 'car' | 'flight' }): string {
  const count = args.places === 1 ? '1 passender Ort' : `${args.places} passende Orte`;
  const themes = args.themeLabels.length > 0 ? ` für ${formatList(args.themeLabels)}` : '';
  // Exact up to 7 h, coarser beyond (Aufgabe F16): "4 h 6 min–4 h 48 min", "über 20 h".
  if (args.mode === 'flight') return `${count}${themes}, ca. ${formatFlightRange(args.minMinutes, args.maxMinutes)} Flug`;
  const span = formatDriveRange(args.minMinutes, args.maxMinutes);
  return `${count}${themes}, ${args.estimated ? 'geschätzt ' : ''}${span} Fahrt`;
}

/** Shown when the wish translation is unavailable (LLM off, budget used up, error). */
export const WISH_FALLBACK_NOTICE =
  'Die automatische Übersetzung deiner Wünsche ist gerade nicht verfügbar. Bitte wähle die passenden Chips direkt aus.';

const wholeEuro = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/**
 * Bargain reasons (architektur.md 6.8): the only allowed savings statements.
 * The wording of konzept.md 5.1 (example 3); the parenthesis names what was
 * compared (the same room) and the mean of its other dates it is measured
 * against, so the percentage can be checked.
 */
export function bargainReasonDate(percent: number, othersMeanTotalCents: number, totalCents: number): string {
  return `${percent} % günstiger als dieselbe Unterkunft an deinen anderen Terminen (gleiches Zimmer: ${wholeEuro.format(Math.round(totalCents / 100))} € statt im Mittel ${wholeEuro.format(Math.round(othersMeanTotalCents / 100))} €)`;
}

/** Board labels for e-mails and server texts (the SPA has the same in i18n/de.ts). */
export const BOARD_LABELS: Record<string, string> = {
  RO: 'ohne Verpflegung',
  BB: 'mit Frühstück',
  HB: 'Halbpension',
  FB: 'Vollpension',
  AI: 'All inclusive',
  OTHER: 'Verpflegung siehe Tarif',
};

/** Server texts of the booking flow (error answers of the API). */
export const BOOKING_TEXTS = {
  disabled: 'Buchungen sind vorübergehend nicht möglich. Bitte versuche es später erneut.',
  offerNotFound: 'Dieses Angebot gehört nicht zu dieser Suche.',
  guestsInvalid: 'Bitte gib für jedes Zimmer einen Gast an.',
  offerUnavailable: 'Dieses Angebot ist leider nicht mehr verfügbar. Bitte wähle ein anderes Angebot oder starte eine neue Suche.',
  paymentUnavailable: 'Die Zahlung ist gerade nicht möglich. Bitte versuche es später erneut.',
  providerUnavailable: 'Wir konnten den aktuellen Preis gerade nicht prüfen. Bitte versuche es in ein paar Minuten erneut.',
  tokenInvalid: 'Der Link ist ungültig oder abgelaufen.',
  priceConfirmationRequired: 'Der Preis hat sich geändert. Bitte bestätige den neuen Preis, bevor du bezahlst.',
  inProgress: 'Die Buchung wird gerade abgeschlossen. Bitte versuche es in einigen Sekunden erneut.',
  invalidState: 'Diese Buchung kann in ihrem aktuellen Zustand nicht abgeschlossen werden.',
  bookFailed: 'Die Unterkunft konnte die Buchung nicht bestätigen. Die Reservierung auf deinem Zahlungsmittel wird wieder freigegeben, meist innerhalb von 1 bis 2 Werktagen.',
  notCancellable: 'Diese Buchung kann nicht storniert werden.',
  cancelFailed: 'Die Stornierung ist fehlgeschlagen. Bitte versuche es später erneut oder schreib uns.',
} as const;
