// Typed e-mail templates (HTML and text) per outbox type. Payloads are
// validated before rendering; texts pass the claims check (npm run check:claims).
import type { EmailType } from '@reiseplaner/db';
import { accessLinkPayload, renderAccessLink } from './access-link';
import { bookingCancelledPayload, renderBookingCancelled } from './booking-cancelled';
import { bookingConfirmationPayload, renderBookingConfirmation } from './booking-confirmation';
import type { RenderedEmail } from './layout';
import { opsAlertPayload, renderOpsAlert } from './ops-alert';
import { renderReviewInvite, reviewInvitePayload } from './review-invite';

export type { RenderedEmail };
export { type AccessLinkPayload } from './access-link';
export { type BookingCancelledPayload } from './booking-cancelled';
export { type BookingConfirmationPayload } from './booking-confirmation';
export { type ReviewInvitePayload } from './review-invite';
export { type OpsAlertPayload } from './ops-alert';

export function renderEmail(type: EmailType, payload: unknown): RenderedEmail {
  switch (type) {
    case 'booking_confirmation':
      return renderBookingConfirmation(bookingConfirmationPayload.parse(payload));
    case 'booking_cancelled':
      return renderBookingCancelled(bookingCancelledPayload.parse(payload));
    case 'access_link':
      return renderAccessLink(accessLinkPayload.parse(payload));
    case 'review_invite':
      return renderReviewInvite(reviewInvitePayload.parse(payload));
    case 'ops_alert':
      return renderOpsAlert(opsAlertPayload.parse(payload));
  }
}
