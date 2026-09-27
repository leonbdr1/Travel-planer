// The running booking flow in sessionStorage (tab-local): session token and
// payment data survive the redirect through the payment page. Nothing here
// goes into URLs or logs.
import type { BookingCreateResponse } from '@reiseplaner/contracts';

export interface BookingFlow {
  create: BookingCreateResponse;
  hotelName: string;
  email: string;
  accessToken?: string;
}

const key = (ref: string) => `booking-flow:${ref}`;

export function saveFlow(flow: BookingFlow): void {
  try {
    sessionStorage.setItem(key(flow.create.booking_ref), JSON.stringify(flow));
  } catch {
    // Storage blocked: the flow then only works without reloads.
  }
}

export function loadFlow(ref: string): BookingFlow | null {
  try {
    const raw = sessionStorage.getItem(key(ref));
    return raw ? (JSON.parse(raw) as BookingFlow) : null;
  } catch {
    return null;
  }
}
