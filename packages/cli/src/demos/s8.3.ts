// S8.3 demo: the booking confirmation e-mail as text, then a send failure of
// the simulated Resend and the second attempt through the real cron
// dispatcher (runScheduled with the outbox-retry schedule).
import { getOutboxEmail } from '@reiseplaner/db';
import { createTestDb } from '@reiseplaner/db/testing';
import { createProviders, fakeMailbox } from '@reiseplaner/providers';
import { CRON_OUTBOX_RETRY, runScheduled } from '@reiseplaner/worker/cron';
import { sendViaOutbox } from '@reiseplaner/worker/mail';
import type { Env } from '@reiseplaner/worker/env';
import type { DemoOutput } from '../lib/output';
import { wranglerVars } from '../lib/worker-env';

const payload = {
  bookingRef: 'K7M2Q9XZ',
  hotelName: 'Hotel Schwanen',
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
  accessUrl: 'https://reiseplaner.example/buchung/K7M2Q9XZ#a=demo',
};

export async function run(out: DemoOutput): Promise<number> {
  const test = await createTestDb();
  try {
    // Two injected failures: the Resend client retries once by itself.
    const failNext = { remaining: 2 };
    const providers = createProviders(
      { mode: 'fake', liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' }, ors: { baseUrl: 'https://api.heigit.org/openrouteservice' }, resend: {}, anthropic: {} },
      { fake: { mailFailNext: failNext } },
    );
    let now = new Date('2026-09-27T10:00:00Z');
    const first = await sendViaOutbox({ db: test.db, mail: providers.mail, now: () => now }, { type: 'booking_confirmation', toEmail: 'gast@example.org', bookingId: null, payload });
    const afterFirst = await getOutboxEmail(test.db, first.id);
    out.log(`1) Sofortversand: ${first.status} (Versuch ${afterFirst?.attempts}, Fehler ${afterFirst?.lastError})`);

    now = new Date('2026-09-27T10:10:00Z');
    const env = { ...wranglerVars(), HYPERDRIVE: { connectionString: 'unused' } } as unknown as Env;
    const result = await runScheduled(CRON_OUTBOX_RETRY, env, { dbFactory: () => ({ ...test.db, close: async () => undefined }), providersFactory: () => providers, now: () => now });
    const afterCron = await getOutboxEmail(test.db, first.id);
    out.log(`2) Cron ${CRON_OUTBOX_RETRY} (outbox-retry): ${JSON.stringify(result)} → Status ${afterCron?.status}, Versuch ${afterCron?.attempts}, Zugangslink aus dem Payload entfernt: ${!afterCron?.payload.accessUrl}`);
    out.log('');
    out.log('Versendete E-Mail (Textfassung):');
    const sent = fakeMailbox().at(-1);
    out.log(`Betreff: ${sent?.subject}`);
    for (const line of (sent?.text ?? '').split('\n')) out.log(`  ${line}`);
    const ok = first.status === 'pending' && afterCron?.status === 'sent' && afterCron.attempts === 2 && (sent?.text ?? '').includes('HCN-482913');
    out.log(ok ? '→ Bestätigung gerendert, zweiter Versuch per Cron versendet' : '→ UNEXPECTED');
    return ok ? 0 : 1;
  } finally {
    await test.close();
  }
}
