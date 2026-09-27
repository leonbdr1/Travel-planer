// S8.2 demo over HTTP against the local stack (simulated LiteAPI and
// Resend): search → POST /bookings (prebook) → complete (twice) → view →
// cancellation preview → cancellation; complete with a foreign token → 403.
import { bookingCompleteResponseSchema, bookingCreateResponseSchema, bookingViewSchema, cancelResponseSchema, searchResultsResponseSchema } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { altchaPayload } from '../lib/altcha';
import type { DemoOutput } from '../lib/output';
import { catalogPlaceIds, demoSearchRequest } from '../lib/search-request';
import { startDemoStack, type DemoStack } from '../lib/stack';
import { seedDevData } from '../seed';

async function call(stack: DemoStack, method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${stack.baseUrl}/api/v1${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { 'x-booking-token': token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: (await res.json()) as unknown };
}

export async function run(out: DemoOutput): Promise<number> {
  out.log('starting local stack …');
  const stack = await startDemoStack({ onReady: (db) => seedDevData(db, () => undefined) });
  try {
    const places = await catalogPlaceIds(stack.db.db, ['Füssen']);
    const created = (await call(stack, 'POST', '/searches', demoSearchRequest(places, { start: '2026-10-01', end: '2026-10-12' }, await altchaPayload(stack.baseUrl)))).body as {
      search_id: string;
      token: string;
    };
    const started = Date.now();
    while (Date.now() - started < constants.SEARCH_JOB_TIMEOUT_S * 1000) {
      const s = (await call(stack, 'GET', `/searches/${created.search_id}?token=${created.token}`)).body as { search: { status: string } };
      if (['done', 'partial', 'failed'].includes(s.search.status)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const results = searchResultsResponseSchema.parse((await call(stack, 'GET', `/searches/${created.search_id}/results?token=${created.token}&refundable=true`)).body);
    const bookingRequest = (offerId: string, lastName: string) => ({
      search_id: created.search_id,
      search_token: created.token,
      offer_id: offerId,
      holder: { first_name: 'Erika', last_name: lastName, email: 'erika@example.org', phone: null },
      guests: [{ room: 1, first_name: 'Erika', last_name: lastName }],
      accepted_terms: true,
      acknowledged_no_withdrawal: true,
    });

    const item = results.items[0];
    if (!item) throw new Error('no result');
    out.log(`Angebot: ${item.hotel.name}, ${item.best_offer.checkin} – ${item.best_offer.checkout}, ${item.best_offer.total_price_eur} €`);
    const create = await call(stack, 'POST', '/bookings', bookingRequest(item.best_offer.id, 'Mustermann'));
    const booking = bookingCreateResponseSchema.parse(create.body);
    out.log(`POST /bookings → ${create.status}: Buchungsnummer ${booking.booking_ref}, Status prebooked, Preis ${booking.price.total_eur} € (geändert: ${booking.price_changed}), Zahlung ${booking.payment.mode}${booking.payment.simulated ? ' (simuliert)' : ''}`);
    if (booking.price_changed) {
      const confirm = await call(stack, 'POST', `/bookings/${booking.booking_ref}/confirm-price`, {}, booking.session_token);
      out.log(`POST confirm-price → ${confirm.status}`);
    }

    const other = bookingCreateResponseSchema.parse((await call(stack, 'POST', '/bookings', bookingRequest(item.best_offer.id, 'Zweitbuchung'))).body);
    const foreign = await call(stack, 'POST', `/bookings/${booking.booking_ref}/complete`, {}, other.session_token);
    out.log(`POST complete mit fremdem Sitzungstoken → ${foreign.status} ${(foreign.body as { error?: { code?: string } }).error?.code ?? ''}`);

    const first = await call(stack, 'POST', `/bookings/${booking.booking_ref}/complete`, {}, booking.session_token);
    const done = bookingCompleteResponseSchema.parse(first.body);
    out.log(`POST complete → ${first.status}: Status ${done.booking.status}, Hotel-Bestätigungsnummer ${done.booking.hotel_confirmation_code}`);
    const second = bookingCompleteResponseSchema.parse((await call(stack, 'POST', `/bookings/${booking.booking_ref}/complete`, {}, booking.session_token)).body);
    out.log(`POST complete (Wiederholung) → gleicher Stand: ${JSON.stringify(second.booking) === JSON.stringify(done.booking)}`);

    const view = bookingViewSchema.parse((await call(stack, 'GET', `/bookings/${booking.booking_ref}`, undefined, done.access_token ?? '')).body);
    out.log(`GET /bookings/${booking.booking_ref} → ${view.status}, ${view.hotel.name}, ${view.holder?.email_masked}, stornierbar: ${view.can_cancel}`);
    const preview = cancelResponseSchema.parse((await call(stack, 'POST', `/bookings/${booking.booking_ref}/cancel`, { dry_run: true }, done.access_token ?? '')).body);
    out.log(`POST cancel (dry_run) → ${JSON.stringify(preview.dry_run ? preview.preview : null)}`);
    const cancelled = cancelResponseSchema.parse((await call(stack, 'POST', `/bookings/${booking.booking_ref}/cancel`, { dry_run: false }, done.access_token ?? '')).body);
    const finalState = cancelled.dry_run ? 'unexpected' : cancelled.booking.status;
    out.log(`POST cancel → ${finalState}`);
    const outbox = await stack.db.db.query<{ type: string; status: string }>('SELECT type, status FROM app.email_outbox ORDER BY id');
    out.log(`E-Mail-Postausgang: ${outbox.map((e) => `${e.type} (${e.status})`).join(', ')}`);
    out.log('Ablauf: draft → prebooked → booking → confirmed → cancelled');

    const ok = foreign.status === 403 && done.booking.status === 'confirmed' && !!done.booking.hotel_confirmation_code && JSON.stringify(second.booking) === JSON.stringify(done.booking) && finalState === 'cancelled';
    out.log(ok ? '→ Buchung, Idempotenz, Token-Prüfung und Stornierung wie geplant' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await stack.stop();
  }
}
