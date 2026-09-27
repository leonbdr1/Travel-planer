import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyBookingEvent, confirmBookingPrice, createBookingDraft, getBookingByRef, lookToBookRatio, type NewBooking } from '../src/repos/bookings';
import { dueEmails, enqueueEmail, getOutboxEmail, markEmailAttemptFailed, markEmailSent } from '../src/repos/outbox';
import { createTestDb, type TestDb } from '../src/testing';

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
  await t.db.query("INSERT INTO app.hotels (id, name) VALUES ('lp-b-1', 'Buchungshaus')");
}, 60_000);
afterAll(async () => t.close());

const draft = (): NewBooking => ({
  searchId: null,
  hotelId: 'lp-b-1',
  offer: {
    offerRowId: '1',
    liteapiOfferId: 'offer-1',
    hotelName: 'Buchungshaus',
    placeName: 'Füssen',
    roomName: 'Doppelzimmer',
    boardType: 'BB',
    refundable: true,
    freeCancelUntil: '2026-09-30T16:00:00Z',
    totalCents: 21200,
    payAtPropertyCents: 1200,
    payAtPropertyKnown: true,
    nights: 2,
  },
  checkin: '2026-10-02',
  checkout: '2026-10-04',
  occupancy: [{ adults: 2, childrenAges: [] }],
  totalCents: 21200,
  currency: 'EUR',
  cancellationPolicy: { refundable: true, freeCancelUntil: '2026-09-30T16:00:00Z' },
  holder: { firstName: 'Max', lastName: 'Muster', email: 'max@example.org', phone: null },
  guests: [{ room: 1, firstName: 'Max', lastName: 'Muster' }],
});

let counter = 0;
const refs = ['AAAAAAAA', 'AAAAAAAA', 'BBBBBBBB', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE'];
const nextRef = () => refs[counter++ % refs.length] as string;

describe('bookings repository', () => {
  it('creates drafts and retries a colliding reference', async () => {
    const a = await createBookingDraft(t.db, draft(), nextRef);
    const b = await createBookingDraft(t.db, draft(), nextRef);
    expect(a.bookingRef).toBe('AAAAAAAA');
    expect(b.bookingRef).toBe('BBBBBBBB');
    const stored = await getBookingByRef(t.db, 'AAAAAAAA');
    expect(stored).toMatchObject({ status: 'draft', totalCents: 21200, currency: 'EUR', holder: { email: 'max@example.org' } });
  });

  it('walks draft → prebooked → booking → confirmed → cancelled and refuses other events', async () => {
    const { id } = await createBookingDraft(t.db, draft(), nextRef);
    expect(await applyBookingEvent(t.db, id, 'book_ok')).toEqual({ ok: false, state: 'draft' });
    const pre = await applyBookingEvent(t.db, id, 'prebook_ok', { prebookId: 'pb-1', transactionId: 'tx-1', totalCents: 22260, priceChanged: true });
    expect(pre.ok && pre.booking).toMatchObject({ status: 'prebooked', prebookId: 'pb-1', transactionId: 'tx-1', totalCents: 22260, priceChanged: true });
    expect(await confirmBookingPrice(t.db, id, new Date())).toBe(true);
    const booking = await applyBookingEvent(t.db, id, 'payment_returned');
    expect(booking.ok && booking.booking.status).toBe('booking');
    expect(await confirmBookingPrice(t.db, id, new Date())).toBe(false);
    const confirmed = await applyBookingEvent(t.db, id, 'book_ok', { liteapiBookingId: 'FKB1', hotelConfirmationCode: 'HCN-1', confirmedAt: new Date() });
    expect(confirmed.ok && confirmed.booking).toMatchObject({ status: 'confirmed', liteapiBookingId: 'FKB1', hotelConfirmationCode: 'HCN-1' });
    const cancelled = await applyBookingEvent(t.db, id, 'cancel_ok', { cancelledAt: new Date(), cancellationFeeCents: 0, refundCents: 22260 });
    expect(cancelled.ok && cancelled.booking).toMatchObject({ status: 'cancelled', cancellationFeeCents: 0, refundCents: 22260 });
    expect(await applyBookingEvent(t.db, id, 'cancel_ok')).toEqual({ ok: false, state: 'cancelled' });
  });

  it('lets exactly one of two concurrent payment returns start the booking (row lock)', async () => {
    const { id } = await createBookingDraft(t.db, draft(), nextRef);
    await applyBookingEvent(t.db, id, 'prebook_ok', { prebookId: 'pb-2', transactionId: 'tx-2' });
    const results = await Promise.all([applyBookingEvent(t.db, id, 'payment_returned'), applyBookingEvent(t.db, id, 'payment_returned')]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, state: 'booking' });
  });

  it('computes the look-to-book ratio from rate requests and confirmed bookings', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await t.db.query("INSERT INTO app.provider_usage (day, provider, endpoint, calls) VALUES ($1::date, 'liteapi', 'hotels/rates', 300)", [today]);
    expect(await lookToBookRatio(t.db, 7)).toBe(300);
  });
});

describe('e-mail outbox', () => {
  it('sends, scrubs secrets from the payload and never sends twice', async () => {
    const e = await enqueueEmail(t.db, { type: 'access_link', toEmail: 'max@example.org', bookingId: null, payload: { bookingRef: 'AAAAAAAA', accessUrl: 'https://x/#a=secret' } });
    expect((await dueEmails(t.db, new Date(Date.now() + 1000), 10)).map((d) => d.id)).toContain(e.id);
    await markEmailSent(t.db, e.id, 'msg-1', new Date());
    await markEmailSent(t.db, e.id, 'msg-2', new Date());
    const stored = await getOutboxEmail(t.db, e.id);
    expect(stored).toMatchObject({ status: 'sent', providerMessageId: 'msg-1', attempts: 1, payload: { bookingRef: 'AAAAAAAA' } });
    expect(stored?.payload).not.toHaveProperty('accessUrl');
  });

  it('retries with backoff and gives up after the maximum attempts', async () => {
    const e = await enqueueEmail(t.db, { type: 'booking_confirmation', toEmail: 'max@example.org', bookingId: null, payload: { accessUrl: 'https://x/#a=secret' } });
    const later = new Date(Date.now() + 600_000);
    for (let i = 1; i <= 4; i += 1) expect(await markEmailAttemptFailed(t.db, e.id, 'HTTP 500', later, 5)).toBe('pending');
    expect((await dueEmails(t.db, new Date(), 10)).map((d) => d.id)).not.toContain(e.id);
    expect(await markEmailAttemptFailed(t.db, e.id, 'HTTP 500', later, 5)).toBe('failed');
    const stored = await getOutboxEmail(t.db, e.id);
    expect(stored).toMatchObject({ status: 'failed', attempts: 5, lastError: 'HTTP 500' });
    expect(stored?.payload).not.toHaveProperty('accessUrl');
  });
});
