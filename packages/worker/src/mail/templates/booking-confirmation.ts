// Booking confirmation (F12, konzept.md 5.1 example 5): booking number, the
// hotel's confirmation number, stay, price, amounts due at the property,
// cancellation terms, the contracting party and the link to the booking.
import { z } from 'zod';
import { buttonHtml, escapeHtml, formatDate, formatDateTime, formatMoney, layout, rowsHtml, rowsText, type RenderedEmail, type Row } from './layout';

export const bookingConfirmationPayload = z.object({
  bookingRef: z.string(),
  hotelName: z.string(),
  placeName: z.string(),
  checkin: z.string(),
  checkout: z.string(),
  nights: z.number().int(),
  roomName: z.string(),
  boardLabel: z.string(),
  guests: z.number().int(),
  totalCents: z.number().int(),
  currency: z.string(),
  payAtPropertyCents: z.number().int(),
  payAtPropertyKnown: z.boolean(),
  refundable: z.boolean(),
  freeCancelUntil: z.string().nullable(),
  /** The free cancellation had already ended when the booking was confirmed. */
  freeCancelEnded: z.boolean().default(false),
  hotelConfirmationCode: z.string().nullable(),
  accessUrl: z.string().url(),
});
export type BookingConfirmationPayload = z.infer<typeof bookingConfirmationPayload>;

export function cancellationLine(p: { refundable: boolean; freeCancelUntil: string | null; freeCancelEnded?: boolean }): string {
  if (!p.refundable) return 'Nicht stornierbar: Bei Stornierung wird der volle Betrag fällig.';
  if (p.freeCancelUntil && p.freeCancelEnded) return `Die kostenlose Stornierung endete am ${formatDateTime(p.freeCancelUntil)}; es gelten die Stornobedingungen der Unterkunft.`;
  if (p.freeCancelUntil) return `Kostenlos stornierbar bis ${formatDateTime(p.freeCancelUntil)}; danach gelten die Stornobedingungen der Unterkunft.`;
  return 'Kostenlos stornierbar.';
}

export function renderBookingConfirmation(p: BookingConfirmationPayload): RenderedEmail {
  const rows: Row[] = [
    { label: 'Buchungsnummer', value: p.bookingRef },
    { label: 'Bestätigungsnummer der Unterkunft', value: p.hotelConfirmationCode ?? 'folgt von der Unterkunft' },
    { label: 'Unterkunft', value: `${p.hotelName}, ${p.placeName}` },
    { label: 'Anreise', value: formatDate(p.checkin) },
    { label: 'Abreise', value: `${formatDate(p.checkout)} (${p.nights} ${p.nights === 1 ? 'Nacht' : 'Nächte'})` },
    { label: 'Zimmer', value: `${p.roomName}, ${p.boardLabel}` },
    { label: 'Gäste', value: String(p.guests) },
    { label: 'Bezahlt', value: formatMoney(p.totalCents, p.currency) },
    {
      label: 'Vor Ort zu zahlen',
      value: p.payAtPropertyKnown
        ? p.payAtPropertyCents > 0
          ? `${formatMoney(p.payAtPropertyCents, p.currency)} (z. B. Kurtaxe)`
          : 'keine bekannten Beträge'
        : 'mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt',
    },
  ];
  const contract = `Vertragspartner für den Aufenthalt ist ${p.hotelName}. Mit der Bestätigungsnummer der Unterkunft kannst du die Buchung auch direkt dort prüfen; zeige sie bei der Anreise vor.`;
  const cancel = cancellationLine(p);
  const html = `<p>Deine Buchung ist bestätigt. Hier sind alle Angaben:</p>${rowsHtml(rows)}<p>${escapeHtml(cancel)}</p><p>${escapeHtml(contract)}</p>${buttonHtml(p.accessUrl, 'Buchung ansehen oder stornieren')}<p style="font-size:13px;color:#52525b">Der Link ist persönlich und 30 Tage gültig. Bitte leite ihn nicht weiter.</p>`;
  const text = `Deine Buchung ist bestätigt. Hier sind alle Angaben:\n\n${rowsText(rows)}\n\n${cancel}\n${contract}\n\nBuchung ansehen oder stornieren:\n${p.accessUrl}\n(Der Link ist persönlich und 30 Tage gültig. Bitte leite ihn nicht weiter.)`;
  return layout('Deine Buchung ist bestätigt', html, text, `Buchung bestätigt: ${p.hotelName}, ${formatDate(p.checkin)} (${p.bookingRef})`);
}
