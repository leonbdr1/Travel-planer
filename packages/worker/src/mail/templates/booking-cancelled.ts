// Cancellation confirmation (F13): stay, fee and refund.
import { z } from 'zod';
import { escapeHtml, formatDate, formatMoney, layout, rowsHtml, rowsText, type RenderedEmail, type Row } from './layout';

export const bookingCancelledPayload = z.object({
  bookingRef: z.string(),
  hotelName: z.string(),
  checkin: z.string(),
  checkout: z.string(),
  feeCents: z.number().int().nullable(),
  refundCents: z.number().int().nullable(),
  currency: z.string(),
});
export type BookingCancelledPayload = z.infer<typeof bookingCancelledPayload>;

export function renderBookingCancelled(p: BookingCancelledPayload): RenderedEmail {
  const rows: Row[] = [
    { label: 'Buchungsnummer', value: p.bookingRef },
    { label: 'Unterkunft', value: p.hotelName },
    { label: 'Aufenthalt', value: `${formatDate(p.checkin)} – ${formatDate(p.checkout)}` },
    { label: 'Stornogebühr', value: p.feeCents === null ? 'laut Abrechnung der Unterkunft' : formatMoney(p.feeCents, p.currency) },
    { label: 'Erstattung', value: p.refundCents === null ? 'laut Abrechnung der Unterkunft' : formatMoney(p.refundCents, p.currency) },
  ];
  const note = 'Die Erstattung geht auf das Zahlungsmittel, mit dem du bezahlt hast. Die Dauer hängt von deiner Bank ab.';
  return layout(
    'Deine Buchung ist storniert',
    `<p>Wir haben deine Buchung storniert.</p>${rowsHtml(rows)}<p>${escapeHtml(note)}</p>`,
    `Wir haben deine Buchung storniert.\n\n${rowsText(rows)}\n\n${note}`,
    `Buchung storniert: ${p.hotelName} (${p.bookingRef})`,
  );
}
