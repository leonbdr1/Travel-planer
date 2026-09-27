// Invitation after the stay to tell us how it went (sent by the daily job).
import { z } from 'zod';
import { productConfig } from '@reiseplaner/config';
import { escapeHtml, layout, type RenderedEmail } from './layout';

export const reviewInvitePayload = z.object({
  bookingRef: z.string(),
  hotelName: z.string(),
  checkout: z.string(),
});
export type ReviewInvitePayload = z.infer<typeof reviewInvitePayload>;

export function renderReviewInvite(p: ReviewInvitePayload): RenderedEmail {
  const lead = `Wie war dein Aufenthalt in ${p.hotelName}? Deine Rückmeldung hilft uns, die Auswahl und die Hinweise zu verbessern.`;
  const how = `Antworte einfach auf diese E-Mail oder schreib an ${productConfig.support.email}.`;
  return layout('Wie war dein Aufenthalt?', `<p>${escapeHtml(lead)}</p><p>${escapeHtml(how)}</p>`, `${lead}\n\n${how}`, `Wie war dein Aufenthalt in ${p.hotelName}?`);
}
