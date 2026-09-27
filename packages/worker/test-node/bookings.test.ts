// Booking flow against PGlite with the simulated LiteAPI and Resend:
// prebook, idempotent complete (LiteAPI book exactly once), tokens per
// purpose and booking, price change, booking failure, cancellation with
// preview, access link, emergency brake.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSearch, getBookingByRef, type Db } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, fakeMailbox, type ProvidersConfig } from '@reiseplaner/providers';
import { ApiError } from '../src/http/errors';
import { cancelBooking, completeBooking, confirmPrice, createBooking, requestAccessLink, viewBooking, type BookingDeps } from '../src/services/bookings';
import { runLoad, runRatesBlock, runScoreStep, sha256Hex } from '../src/services/search-run';
import { signToken } from '../src/services/tokens';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const SEARCH_TOKEN = 'search-token-for-bookings-0123456789';
let now = new Date('2026-09-27T08:00:00Z');

let test: TestDb;
let searchId: string;
let calls: Record<string, number>;
let deps: BookingDeps;

beforeEach(async () => {
  test = await createTestDb();
  calls = {};
  now = new Date('2026-09-27T08:00:00Z');
  const providers = createProviders(config, { now: () => now, sleep: async () => undefined, onCall: (p, e) => (calls[`${p}:${e}`] = (calls[`${p}:${e}`] ?? 0) + 1) });
  await test.db.query(
    `INSERT INTO app.geo_localities (geonameid, name, ascii_name, country_code, admin1, lat, lng, population, feature_code, search_text)
     VALUES (990601, 'Füssen', 'Fussen', 'DE', '02', 47.57143, 10.70171, 15000, 'PPL', 'fussen')`,
  );
  const place = await test.db.query<{ id: string }>(
    `INSERT INTO app.places (slug, name, geonameid, country_code, lat, lng, kind, verified)
     VALUES ('ort-990601', 'Füssen', 990601, 'DE', 47.57143, 10.70171, 'user', false) RETURNING id::text AS id`,
  );
  const placeId = place[0]?.id ?? '';
  const created = await createSearch(test.db, {
    tokenHash: await sha256Hex(SEARCH_TOKEN),
    request: {
      origin: { geonameid: 2825297, label: 'Stuttgart', lat: 48.78, lng: 9.18 },
      max_drive_minutes: 240,
      themes: [],
      window: { start: '2026-10-01', end: '2026-10-20' },
      nights: 2,
      arrival_weekdays: [5],
      occupancy: { rooms: 1, adults: 2, children_ages: [] },
      budget_total_eur: null,
      filters: { min_stars: null, min_rating: null, min_reviews: null, property_types: [], refundable_only: false, board: null },
      chips: [],
      place_ids: [placeId],
    },
    originLat: 48.78,
    originLng: 9.18,
    ipHash: null,
    places: [{ placeId, driveMinutes: 150, source: 'user' }],
    dates: [
      { checkin: '2026-10-09', checkout: '2026-10-11' },
      { checkin: '2026-10-16', checkout: '2026-10-18' },
    ],
  });
  searchId = created.id;
  const runDeps = { db: test.db, liteapi: providers.liteapi, now: () => now, liteapiDailyCap: 60_000, currency: 'EUR', guestNationality: 'DE' };
  const { blocks } = await runLoad(runDeps, searchId);
  for (let i = 0; i < blocks; i += 1) await runRatesBlock(runDeps, searchId, i);
  await runScoreStep(runDeps, searchId);
  let n = 0;
  deps = {
    db: test.db,
    liteapi: providers.liteapi,
    mail: providers.mail,
    now: () => now,
    signingKey: 'test-signing-key-not-secret',
    origin: 'http://localhost:5173',
    paymentMode: 'sandbox',
    simulatedPayment: true,
    bookingEnabled: true,
    randomBytes: (size) => Uint8Array.from({ length: size }, (_, i) => (n * 37 + i * 11 + 3) % 256).map((v, i) => (i === 0 ? (n++ * 29 + v) % 256 : v)),
  };
});
afterEach(async () => test.close());

async function offers(db: Db, where = 'TRUE'): Promise<Array<{ id: string; refundable: boolean }>> {
  return db.query<{ id: string; refundable: boolean }>(`SELECT id::text AS id, refundable FROM app.offers WHERE search_id = $1::uuid AND ${where} ORDER BY id`, [searchId]);
}

const request = (offerId: string, lastName = 'Muster') => ({
  search_id: searchId,
  search_token: SEARCH_TOKEN,
  offer_id: offerId,
  holder: { first_name: 'Max', last_name: lastName, email: 'max@example.org', phone: null },
  guests: [{ room: 1, first_name: 'Max', last_name: lastName }],
  accepted_terms: true as const,
  acknowledged_no_withdrawal: true as const,
});

/** First refundable offer whose prebook keeps (or changes) the price. */
async function offerWithPrice(changed: boolean): Promise<{ offerId: string; created: Awaited<ReturnType<typeof createBooking>> }> {
  for (const o of await offers(test.db, 'refundable')) {
    const created = await createBooking(deps, request(o.id));
    if (created.price_changed === changed) return { offerId: o.id, created };
  }
  throw new Error(`no offer with price_changed=${changed}`);
}

const apiError = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof ApiError) return { status: err.status, code: err.code };
    throw err;
  }
  throw new Error('expected an ApiError');
};

describe('booking flow (architektur.md 6.11, 7.2)', () => {
  it('prebooks, completes once, answers repeats with the same state and sends the confirmation', async () => {
    const { created } = await offerWithPrice(false);
    expect(created.payment).toMatchObject({ mode: 'sandbox', simulated: true, return_url: `http://localhost:5173/buchung/${created.booking_ref}/abschluss` });
    expect(created.booking_ref).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect((await getBookingByRef(test.db, created.booking_ref))?.status).toBe('prebooked');

    const mailsBefore = fakeMailbox().length;
    const done = await completeBooking(deps, created.booking_ref, created.session_token);
    expect(done.booking.status).toBe('confirmed');
    expect(done.booking.hotel_confirmation_code).toMatch(/^HCN-\d{6}$/);
    expect(done.access_token).toBeTruthy();
    expect(fakeMailbox().length).toBe(mailsBefore + 1);
    expect(fakeMailbox().at(-1)?.text).toContain(done.booking.hotel_confirmation_code as string);

    const again = await completeBooking(deps, created.booking_ref, created.session_token);
    expect(again.booking).toEqual(done.booking);
    expect(calls['liteapi:rates/book']).toBe(1);
    expect(fakeMailbox().length).toBe(mailsBefore + 1);

    const view = await viewBooking(deps, created.booking_ref, done.access_token as string);
    expect(view).toMatchObject({ status: 'confirmed', holder: { first_name: 'Max', email_masked: 'm***@example.org' }, can_cancel: true });
  });

  it('books exactly once when two completes race', async () => {
    const { created } = await offerWithPrice(false);
    const results = await Promise.allSettled([completeBooking(deps, created.booking_ref, created.session_token), completeBooking(deps, created.booking_ref, created.session_token)]);
    expect(calls['liteapi:rates/book']).toBe(1);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      if (r.status === 'rejected') expect(r.reason).toMatchObject({ status: 409, code: 'booking_in_progress' });
    }
    expect((await getBookingByRef(test.db, created.booking_ref))?.status).toBe('confirmed');
  });

  it('rejects foreign, wrong-purpose, forged and expired tokens with 403', async () => {
    const { created } = await offerWithPrice(false);
    const other = await createBooking(deps, request((await offers(test.db, 'refundable'))[0]?.id ?? ''));
    expect(await apiError(completeBooking(deps, created.booking_ref, other.session_token))).toEqual({ status: 403, code: 'forbidden' });
    expect(await apiError(completeBooking(deps, created.booking_ref, `${created.session_token.slice(0, -2)}xx`))).toEqual({ status: 403, code: 'forbidden' });
    expect(await apiError(viewBooking(deps, created.booking_ref, created.session_token))).toEqual({ status: 403, code: 'forbidden' });
    const forged = await signToken('another-key-entirely-000000', { bookingId: 'x', purpose: 'session', expiresAt: new Date(now.getTime() + 60_000) });
    expect(await apiError(completeBooking(deps, created.booking_ref, forged))).toEqual({ status: 403, code: 'forbidden' });
    now = new Date(now.getTime() + 3 * 3_600_000);
    expect(await apiError(completeBooking(deps, created.booking_ref, created.session_token))).toEqual({ status: 403, code: 'forbidden' });
    expect(calls['liteapi:rates/book']).toBeUndefined();
  });

  it('asks for confirmation of a changed price before booking', async () => {
    const { created } = await offerWithPrice(true);
    expect(created.price.total_eur).toBeGreaterThan(created.previous_price.total_eur);
    expect(await apiError(completeBooking(deps, created.booking_ref, created.session_token))).toEqual({ status: 409, code: 'price_confirmation_required' });
    expect((await confirmPrice(deps, created.booking_ref, created.session_token)).confirmed).toBe(true);
    expect((await completeBooking(deps, created.booking_ref, created.session_token)).booking.total_eur).toBe(created.price.total_eur);
  });

  it('marks the booking failed when the hotel rejects it', async () => {
    let failing: Awaited<ReturnType<typeof createBooking>> | undefined;
    for (const o of await offers(test.db, 'refundable')) {
      const c = await createBooking(deps, request(o.id, 'Fehlerfall'));
      if (!c.price_changed) {
        failing = c;
        break;
      }
    }
    expect(await apiError(completeBooking(deps, failing?.booking_ref ?? '', failing?.session_token ?? ''))).toEqual({ status: 409, code: 'booking_failed' });
    expect((await getBookingByRef(test.db, failing?.booking_ref ?? ''))?.status).toBe('failed');
    expect(await apiError(completeBooking(deps, failing?.booking_ref ?? '', failing?.session_token ?? ''))).toEqual({ status: 409, code: 'invalid_state' });
  });

  it('previews and performs the cancellation, then mails it', async () => {
    const { created } = await offerWithPrice(false);
    const done = await completeBooking(deps, created.booking_ref, created.session_token);
    const token = done.access_token as string;
    const preview = await cancelBooking(deps, created.booking_ref, token, true);
    expect(preview).toEqual({ dry_run: true, preview: { kind: 'free', fee_eur: 0, refund_eur: done.booking.total_eur } });
    const mails = fakeMailbox().length;
    const cancelled = await cancelBooking(deps, created.booking_ref, token, false);
    expect(cancelled.dry_run === false && cancelled.booking).toMatchObject({ status: 'cancelled', cancellation_fee_eur: 0, refund_eur: done.booking.total_eur, can_cancel: false });
    expect(fakeMailbox().length).toBe(mails + 1);
    expect(fakeMailbox().at(-1)?.subject).toContain('Buchung storniert');
    expect(await apiError(cancelBooking(deps, created.booking_ref, token, false))).toEqual({ status: 409, code: 'not_cancellable' });
  });

  it('sends an access link only when reference and e-mail match', async () => {
    const { created } = await offerWithPrice(false);
    await completeBooking(deps, created.booking_ref, created.session_token);
    const mails = fakeMailbox().length;
    expect(await requestAccessLink(deps, created.booking_ref.toLowerCase(), 'MAX@example.org')).toBe(true);
    expect(fakeMailbox().length).toBe(mails + 1);
    expect(fakeMailbox().at(-1)?.text).toContain(`/buchung/${created.booking_ref}#a=`);
    expect(await requestAccessLink(deps, created.booking_ref, 'other@example.org')).toBe(false);
    expect(await requestAccessLink(deps, 'ZZZZZZZZ', 'max@example.org')).toBe(false);
    expect(fakeMailbox().length).toBe(mails + 1);
  });

  it('refuses bookings when the emergency brake is on, and bookings for other searches', async () => {
    const [first] = await offers(test.db);
    expect(await apiError(createBooking({ ...deps, bookingEnabled: false }, request(first?.id ?? '')))).toEqual({ status: 503, code: 'booking_disabled' });
    expect(await apiError(createBooking(deps, { ...request(first?.id ?? ''), search_token: 'wrong-token-0000000000000000' }))).toEqual({ status: 404, code: 'not_found' });
    expect(await apiError(createBooking(deps, { ...request(first?.id ?? ''), guests: [{ room: 2, first_name: 'A', last_name: 'B' }] }))).toEqual({ status: 400, code: 'guests_invalid' });
  });
});
