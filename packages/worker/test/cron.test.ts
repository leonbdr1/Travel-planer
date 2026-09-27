// Cron Trigger `outbox-retry` in workerd: a pending e-mail is sent when the
// scheduled handler runs (createScheduledController, architektur.md 6.12).
// The local database serves one connection at a time, so the test closes
// its own connection before the handler runs.
import { env } from 'cloudflare:workers';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createPostgresDb } from '@reiseplaner/db';
import worker from '../src/index';

async function withDb<T>(fn: (db: ReturnType<typeof createPostgresDb>) => Promise<T>): Promise<T> {
  const db = createPostgresDb(env.HYPERDRIVE.connectionString, { max: 1 });
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
}

describe('cron outbox-retry', () => {
  it('sends due e-mails from the outbox', async () => {
    const id = await withDb(async (db) => {
      const rows = await db.query<{ id: string }>(
        `INSERT INTO app.email_outbox (type, to_email, payload, next_attempt_at, attempts)
         VALUES ('access_link', 'cron@example.org', $1::text::jsonb, now() - interval '1 minute', 1) RETURNING id::text AS id`,
        [JSON.stringify({ bookingRef: 'K7M2Q9XZ', hotelName: 'Hotel Schwanen', accessUrl: 'https://reiseplaner.example/buchung/K7M2Q9XZ#a=t', validDays: 30 })],
      );
      return rows[0]?.id ?? '';
    });
    const controller = createScheduledController({ scheduledTime: new Date(), cron: '*/10 * * * *' });
    const ctx = createExecutionContext();
    await worker.scheduled(controller, env, ctx);
    await waitOnExecutionContext(ctx);
    const after = await withDb((db) =>
      db.query<{ status: string; attempts: number; has_link: boolean }>(
        "SELECT status, attempts, payload ? 'accessUrl' AS has_link FROM app.email_outbox WHERE id = $1::bigint",
        [id],
      ),
    );
    expect(after[0]).toEqual({ status: 'sent', attempts: 2, has_link: false });
  });
});
