// Booking contracts (architektur.md 7.2, 7.3 BookingCreate, 10): creation
// with prebook, price confirmation, completion after payment, view and
// cancellation with the access token, access link on request.
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const name = z.string().trim().min(1).max(100);
const bookingRef = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{8}$/);

export const bookingCreateRequestSchema = z.object({
  search_id: z.uuid(),
  search_token: z.string().min(20).max(200),
  offer_id: z.string().regex(/^\d{1,18}$/),
  holder: z.object({
    first_name: name,
    last_name: name,
    email: z.email().max(254),
    phone: z.string().trim().max(40).nullable(),
  }),
  /** Lead guest per room (room numbers 1…n). */
  guests: z.array(z.object({ room: z.number().int().min(1).max(20), first_name: name, last_name: name })).min(1).max(20),
  accepted_terms: z.literal(true),
  acknowledged_no_withdrawal: z.literal(true),
});
export type BookingCreateRequest = z.infer<typeof bookingCreateRequestSchema>;

const price = z.object({ total_eur: z.number(), currency: z.string() });

export const bookingCreateResponseSchema = z.object({
  booking_ref: bookingRef,
  session_token: z.string(),
  price,
  previous_price: price,
  price_changed: z.boolean(),
  payment: z.object({
    secret_key: z.string(),
    mode: z.enum(['sandbox', 'live']),
    /** Fake mode: the SPA shows a simulated payment instead of the SDK. */
    simulated: z.boolean(),
    return_url: z.string(),
  }),
});
export type BookingCreateResponse = z.infer<typeof bookingCreateResponseSchema>;

export const bookingViewSchema = z.object({
  booking_ref: bookingRef,
  status: z.enum(['draft', 'prebooked', 'booking', 'confirmed', 'failed', 'cancelled']),
  hotel: z.object({ id: z.string(), name: z.string(), place_name: z.string() }),
  checkin: isoDate,
  checkout: isoDate,
  nights: z.number().int(),
  room_name: z.string(),
  board_type: z.string(),
  rooms: z.number().int(),
  guests: z.number().int(),
  total_eur: z.number(),
  currency: z.string(),
  pay_at_property_eur: z.number(),
  pay_at_property_known: z.boolean(),
  cancellation: z.object({ refundable: z.boolean(), free_cancel_until: z.string().nullable() }),
  hotel_confirmation_code: z.string().nullable(),
  holder: z.object({ first_name: z.string(), last_name: z.string(), email_masked: z.string() }).nullable(),
  confirmed_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancellation_fee_eur: z.number().nullable(),
  refund_eur: z.number().nullable(),
  can_cancel: z.boolean(),
});
export type BookingView = z.infer<typeof bookingViewSchema>;

export const bookingCompleteResponseSchema = z.object({
  booking: bookingViewSchema,
  /** Only for confirmed bookings: opens the booking view (30 days). */
  access_token: z.string().nullable(),
});
export type BookingCompleteResponse = z.infer<typeof bookingCompleteResponseSchema>;

export const confirmPriceResponseSchema = z.object({ booking_ref: bookingRef, price, confirmed: z.literal(true) });

export const cancelRequestSchema = z.object({ dry_run: z.boolean() });
export const cancellationPreviewSchema = z.object({
  kind: z.enum(['free', 'full', 'fee_unknown']),
  fee_eur: z.number().nullable(),
  refund_eur: z.number().nullable(),
});
export const cancelResponseSchema = z.discriminatedUnion('dry_run', [
  z.object({ dry_run: z.literal(true), preview: cancellationPreviewSchema }),
  z.object({ dry_run: z.literal(false), booking: bookingViewSchema }),
]);
export type CancelResponse = z.infer<typeof cancelResponseSchema>;

export const accessLinkRequestSchema = z.object({
  booking_ref: z.string().trim().min(8).max(20),
  email: z.email().max(254),
  altcha: z.string().min(1).max(10_000),
});
export const accessLinkResponseSchema = z.object({ accepted: z.literal(true) });
