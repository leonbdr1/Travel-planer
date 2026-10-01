// Booking API calls; tokens go in the X-Booking-Token header.
import {
  accessLinkResponseSchema,
  bookingCompleteResponseSchema,
  bookingCreateResponseSchema,
  bookingViewSchema,
  cancelResponseSchema,
  confirmPriceResponseSchema,
  type BookingCreateRequest,
} from '@reiseplaner/contracts';
import { apiRequest } from '../../api/client';
import { solveAltcha } from '../search/run-api';

const auth = (token: string) => ({ 'X-Booking-Token': token });

export const createBooking = (req: BookingCreateRequest) => apiRequest('/bookings', bookingCreateResponseSchema, { body: req });

export const confirmPrice = (ref: string, token: string) =>
  apiRequest(`/bookings/${encodeURIComponent(ref)}/confirm-price`, confirmPriceResponseSchema, { method: 'POST', body: {}, headers: auth(token) });

export const completeBooking = (ref: string, token: string) =>
  apiRequest(`/bookings/${encodeURIComponent(ref)}/complete`, bookingCompleteResponseSchema, { method: 'POST', body: {}, headers: auth(token) });

export const fetchBooking = (ref: string, token: string, signal?: AbortSignal) =>
  apiRequest(`/bookings/${encodeURIComponent(ref)}`, bookingViewSchema, { headers: auth(token), ...(signal ? { signal } : {}) });

export const cancelBooking = (ref: string, token: string, dryRun: boolean) =>
  apiRequest(`/bookings/${encodeURIComponent(ref)}/cancel`, cancelResponseSchema, { method: 'POST', body: { dry_run: dryRun }, headers: auth(token) });

/** Without a reference the e-mail lists every booking of the address. */
export async function requestAccessLink(ref: string | null, email: string) {
  const altcha = await solveAltcha();
  return apiRequest('/bookings/access-link', accessLinkResponseSchema, { body: { ...(ref ? { booking_ref: ref } : {}), email, altcha }, acceptStatuses: [202] });
}
