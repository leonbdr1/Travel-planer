// Access link on request (POST /bookings/access-link).
import { z } from 'zod';
import { buttonHtml, escapeHtml, layout, type RenderedEmail } from './layout';

export const accessLinkPayload = z.object({
  bookingRef: z.string(),
  hotelName: z.string(),
  accessUrl: z.string().url(),
  validDays: z.number().int(),
});
export type AccessLinkPayload = z.infer<typeof accessLinkPayload>;

export function renderAccessLink(p: AccessLinkPayload): RenderedEmail {
  const lead = `Hier ist dein Link zur Buchung ${p.bookingRef} (${p.hotelName}). Er ist ${p.validDays} Tage gültig.`;
  const hint = 'Du hast den Link nicht angefordert? Dann kannst du diese E-Mail ignorieren.';
  return layout(
    'Dein Link zur Buchung',
    `<p>${escapeHtml(lead)}</p>${buttonHtml(p.accessUrl, 'Buchung ansehen')}<p style="font-size:13px;color:#52525b">${escapeHtml(hint)}</p>`,
    `${lead}\n\n${p.accessUrl}\n\n${hint}`,
    `Dein Link zur Buchung ${p.bookingRef}`,
  );
}
