// Access links on request (POST /bookings/access-link): the link to one
// booking, or (without a reference) all bookings of the address, each with
// its own link – the booking history without an account.
import { z } from 'zod';
import { productConfig } from '@reiseplaner/config';
import { buttonHtml, escapeHtml, formatDate, layout, type RenderedEmail } from './layout';

const singlePayload = z.object({
  bookingRef: z.string(),
  hotelName: z.string(),
  accessUrl: z.string().url(),
  validDays: z.number().int(),
});

const overviewPayload = z.object({
  bookings: z
    .array(
      z.object({
        bookingRef: z.string(),
        hotelName: z.string(),
        checkin: z.string(),
        checkout: z.string(),
        cancelled: z.boolean(),
        accessUrl: z.string().url(),
      }),
    )
    .min(1),
  validDays: z.number().int(),
});

export const accessLinkPayload = z.union([singlePayload, overviewPayload]);
export type AccessLinkPayload = z.infer<typeof accessLinkPayload>;

const HINT = 'Du hast das nicht angefordert? Dann kannst du diese E-Mail ignorieren.';

export function renderAccessLink(p: AccessLinkPayload): RenderedEmail {
  if ('bookings' in p) return renderOverview(p);
  const lead = `Hier ist dein Link zur Buchung ${p.bookingRef} (${p.hotelName}). Er ist ${p.validDays} Tage gültig.`;
  return layout(
    'Dein Link zur Buchung',
    `<p>${escapeHtml(lead)}</p>${buttonHtml(p.accessUrl, 'Buchung ansehen')}<p style="font-size:13px;color:#52525b">${escapeHtml(HINT)}</p>`,
    `${lead}\n\n${p.accessUrl}\n\n${HINT}`,
    `Dein Link zur Buchung ${p.bookingRef}`,
  );
}

function renderOverview(p: z.infer<typeof overviewPayload>): RenderedEmail {
  const lead = `Alle Buchungen mit dieser E-Mail-Adresse. Jeder Link ist ${p.validDays} Tage gültig.`;
  const line = (b: (typeof p.bookings)[number]) =>
    `${b.hotelName}, ${formatDate(b.checkin)} – ${formatDate(b.checkout)} · ${b.bookingRef}${b.cancelled ? ' · storniert' : ''}`;
  const items = p.bookings
    .map((b) => `<li style="margin:0 0 12px"><a href="${escapeHtml(b.accessUrl)}" style="color:${productConfig.brand.colors.primary};font-weight:600">${escapeHtml(line(b))}</a></li>`)
    .join('');
  return layout(
    'Deine Buchungen',
    `<p>${escapeHtml(lead)}</p><ul style="padding-left:18px;margin:16px 0">${items}</ul><p style="font-size:13px;color:#52525b">${escapeHtml(HINT)}</p>`,
    `${lead}\n\n${p.bookings.map((b) => `${line(b)}\n${b.accessUrl}`).join('\n\n')}\n\n${HINT}`,
    'Deine Buchungen',
  );
}
