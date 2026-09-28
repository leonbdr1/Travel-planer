// E-mail templates and the outbox: rendering (HTML escaped, text version),
// immediate send, retry by the cron function with backoff, giving up after
// the maximum attempts; cron schedules match wrangler.jsonc and every
// heartbeat job has a watchdog threshold.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import { getOutboxEmail } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders, fakeMailbox, type ProvidersConfig } from '@reiseplaner/providers';
import { CRON_JOBS, CRON_SCHEDULES } from '../src/cron';
import { SEARCH_WORKFLOW_HEARTBEAT_JOB } from '../src/services/heartbeat';
import { retryDueEmails, sendViaOutbox } from '../src/mail/outbox';
import { renderEmail } from '../src/mail/templates';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};

export const confirmation = {
  bookingRef: 'K7M2Q9XZ',
  hotelName: 'Hotel <Schwanen>',
  placeName: 'Füssen',
  checkin: '2026-10-09',
  checkout: '2026-10-11',
  nights: 2,
  roomName: 'Doppelzimmer Komfort mit Balkon',
  boardLabel: 'mit Frühstück',
  guests: 2,
  totalCents: 29314,
  currency: 'EUR',
  payAtPropertyCents: 1200,
  payAtPropertyKnown: true,
  refundable: true,
  freeCancelUntil: '2026-10-07T16:00:00Z',
  hotelConfirmationCode: 'HCN-482913',
  accessUrl: 'https://reiseplaner.example/buchung/K7M2Q9XZ#a=token',
};

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => test.close());

describe('e-mail templates', () => {
  it('renders the confirmation with booking and hotel confirmation number, contract partner and escaped HTML', () => {
    const mail = renderEmail('booking_confirmation', confirmation);
    expect(mail.subject).toBe('Buchung bestätigt: Hotel <Schwanen>, Fr., 09.10.2026 (K7M2Q9XZ)');
    for (const part of ['Buchungsnummer: K7M2Q9XZ', 'Bestätigungsnummer der Unterkunft: HCN-482913', 'Bezahlt: 293,14\u00a0€', 'Vor Ort zu zahlen: 12,00\u00a0€ (z. B. Kurtaxe)', 'Vertragspartner für den Aufenthalt ist Hotel <Schwanen>', 'Kostenlos stornierbar bis 07.10.2026, 18:00 Uhr']) {
      expect(mail.text).toContain(part);
    }
    expect(mail.html).toContain('Hotel &lt;Schwanen&gt;');
    expect(mail.html).not.toContain('<Schwanen>');
  });

  it('rejects payloads that do not match the template', () => {
    expect(() => renderEmail('booking_confirmation', { bookingRef: 'X' })).toThrow();
  });

  it('renders cancellation, access link and review invitation', () => {
    expect(renderEmail('booking_cancelled', { bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', checkin: '2026-10-09', checkout: '2026-10-11', feeCents: 0, refundCents: 29314, currency: 'EUR' }).text).toContain('Erstattung: 293,14\u00a0€');
    expect(renderEmail('access_link', { bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', accessUrl: 'https://reiseplaner.example/buchung/K7M2Q9XZ#a=t', validDays: 30 }).text).toContain('30 Tage gültig');
    expect(renderEmail('review_invite', { bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', checkout: '2026-10-11' }).subject).toBe('Wie war dein Aufenthalt in Hotel Schwanen?');
  });
});

describe('outbox', () => {
  it('sends right away and removes the access link from the stored payload', async () => {
    const { mail } = createProviders(config);
    const before = fakeMailbox().length;
    const result = await sendViaOutbox({ db: test.db, mail, now: () => new Date() }, { type: 'booking_confirmation', toEmail: 'max@example.org', bookingId: null, payload: confirmation });
    expect(result.status).toBe('sent');
    expect(fakeMailbox().length).toBe(before + 1);
    expect(fakeMailbox().at(-1)?.text).toContain('HCN-482913');
    const stored = await getOutboxEmail(test.db, result.id);
    expect(stored?.payload).not.toHaveProperty('accessUrl');
  });

  it('retries a failed send through the cron function after the backoff', async () => {
    // The Resend client retries once by itself, so two failures fail the first delivery.
    const failNext = { remaining: 2 };
    const { mail } = createProviders(config, { fake: { mailFailNext: failNext } });
    let now = new Date('2026-09-27T10:00:00Z');
    const deps = { db: test.db, mail, now: () => now };
    const first = await sendViaOutbox(deps, { type: 'access_link', toEmail: 'max@example.org', bookingId: null, payload: { bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', accessUrl: 'https://reiseplaner.example/x', validDays: 30 } });
    expect(first.status).toBe('pending');
    expect(await retryDueEmails(deps)).toEqual({ sent: 0, pending: 0, failed: 0 });
    now = new Date('2026-09-27T10:02:00Z');
    expect(await retryDueEmails(deps)).toEqual({ sent: 1, pending: 0, failed: 0 });
    expect(await getOutboxEmail(test.db, first.id)).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('gives up after five attempts', async () => {
    const { mail } = createProviders(config, { fake: { mailFailNext: { remaining: 10 } } });
    let now = new Date('2026-09-27T10:00:00Z');
    const deps = { db: test.db, mail, now: () => now };
    const first = await sendViaOutbox(deps, { type: 'access_link', toEmail: 'max@example.org', bookingId: null, payload: { bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', accessUrl: 'https://reiseplaner.example/x', validDays: 30 } });
    for (let i = 0; i < 6; i += 1) {
      now = new Date(now.getTime() + 3 * 3_600_000);
      await retryDueEmails(deps);
    }
    expect(await getOutboxEmail(test.db, first.id)).toMatchObject({ status: 'failed', attempts: 5 });
  });

  it('gives every heartbeat job a watchdog threshold (product.config ops.heartbeat_max_age_min)', () => {
    const jobs = [...Object.values(CRON_JOBS), SEARCH_WORKFLOW_HEARTBEAT_JOB].sort();
    expect(Object.keys(productConfig.ops.heartbeat_max_age_min).sort()).toEqual(jobs);
  });

  it('keeps the cron schedules in sync with wrangler.jsonc', () => {
    const wrangler = readFileSync(resolve(import.meta.dirname, '../wrangler.jsonc'), 'utf8');
    const crons = /"crons":\s*\[([^\]]*)\]/.exec(wrangler)?.[1] ?? '';
    expect(crons.split(',').map((c) => c.trim().replace(/"/g, '')).filter(Boolean)).toEqual([...CRON_SCHEDULES]);
  });
});
