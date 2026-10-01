// Support tool `npm run cli -- buchungen` (B5): list and detail of bookings
// with masked e-mail, e-mail delivery state and a hint on typos.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyBookingEvent, createBookingDraft, enqueueEmail } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { bookingDetail, bookingList, maskEmail } from '../src/commands/bookings';

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
  await test.db.query("INSERT INTO app.hotels (id, name) VALUES ('lp-1', 'Hotel Schwanen')");
});
afterEach(async () => test.close());

async function draft(ref: string) {
  return createBookingDraft(
    test.db,
    {
      searchId: null,
      hotelId: 'lp-1',
      offer: {
        offerRowId: '1',
        liteapiOfferId: 'offer-1',
        hotelName: 'Hotel Schwanen',
        placeName: 'Füssen',
        roomName: 'Doppelzimmer',
        boardType: 'BB',
        refundable: true,
        freeCancelUntil: '2026-10-07T16:00:00Z',
        totalCents: 29_314,
        payAtPropertyCents: 0,
        payAtPropertyKnown: true,
        nights: 2,
      },
      checkin: '2026-10-09',
      checkout: '2026-10-11',
      occupancy: [{ adults: 2, childrenAges: [] }],
      totalCents: 29_314,
      currency: 'EUR',
      cancellationPolicy: { refundable: true, freeCancelUntil: '2026-10-07T16:00:00Z' },
      holder: { firstName: 'Erika', lastName: 'Mustermann', email: 'erika@example.org', phone: null },
      guests: [{ room: 1, firstName: 'Erika', lastName: 'Mustermann' }],
    },
    () => ref,
  );
}

describe('buchungen', () => {
  it('lists the latest bookings with masked e-mail, optionally by status', async () => {
    const a = await draft('K7M2Q9XZ');
    await draft('Q2W3E4R5');
    await applyBookingEvent(test.db, a.id, 'prebook_ok', { prebookId: 'p', transactionId: 't', totalCents: 29_314, currency: 'EUR', priceChanged: false });
    const all = (await bookingList(test.db, { limit: 10 })).join('\n');
    expect(all).toContain('| K7M2Q9XZ | reserviert, Zahlung offen | Hotel Schwanen, Füssen | 09.10.2026–11.10.2026 | 293,14 € |');
    expect(all).toContain('| Q2W3E4R5 | angelegt |');
    expect(all).toContain('e***@example.org');
    expect(all).not.toContain('erika@example.org');
    expect((await bookingList(test.db, { status: 'draft', limit: 10 })).join('\n')).not.toContain('K7M2Q9XZ');
    expect(await bookingList(test.db, { status: 'confirmed', limit: 10 })).toEqual(['Keine Buchungen.']);
  });

  it('shows one booking with its e-mails, and similar references on a typo', async () => {
    const b = await draft('K7M2Q9XZ');
    await enqueueEmail(test.db, { type: 'booking_confirmation', toEmail: 'erika@example.org', bookingId: b.id, payload: {} });
    const lines = (await bookingDetail(test.db, 'k7m2q9xz'))?.join('\n') ?? '';
    expect(lines).toContain('Buchung K7M2Q9XZ – angelegt');
    expect(lines).toContain('Stornierung:       kostenlos bis 07.10.2026, 18:00 Uhr');
    expect(lines).toContain('booking_confirmation: pending, 0 Versuch(e)');
    expect(lines).not.toContain('erika@example.org');
    expect(await bookingDetail(test.db, 'K7M2Q9XY')).toEqual(['Keine Buchung K7M2Q9XY. Ähnlich: K7M2Q9XZ']);
    expect(await bookingDetail(test.db, 'ZZZZZZZZ')).toBeNull();
  });

  it('masks addresses and survives erased guest data', () => {
    expect(maskEmail('max.muster@example.org')).toBe('m***@example.org');
    expect(maskEmail(null)).toBe('(gelöscht)');
  });
});
