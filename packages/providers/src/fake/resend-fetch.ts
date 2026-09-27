// Simulated Resend: accepts every e-mail, returns a message id and keeps the
// last messages in memory. The e-mail outbox in the database stays the record.
import type { FetchLike } from '../http/request';
import { hashString } from './random';

export interface SentFakeMail {
  id: string;
  to: string;
  subject: string;
  text: string;
}

const sent: SentFakeMail[] = [];

export function fakeMailbox(): readonly SentFakeMail[] {
  return sent;
}

export interface FakeResendOptions {
  /** Fail the next n sends with HTTP 500 (outbox retry tests). */
  failNext?: { remaining: number };
}

export function createFakeResendFetch(options: FakeResendOptions = {}): FetchLike {
  return async (_input, init) => {
    if (options.failNext && options.failNext.remaining > 0) {
      options.failNext.remaining -= 1;
      return new Response(JSON.stringify({ message: 'injected failure' }), { status: 500 });
    }
    const body = JSON.parse(String(init?.body ?? '{}')) as { to: string[]; subject: string; text: string };
    const id = `fake_${hashString(`${body.to.join(',')}|${body.subject}|${sent.length}`).toString(36)}`;
    sent.push({ id, to: body.to[0] ?? '', subject: body.subject, text: body.text });
    if (sent.length > 200) sent.shift();
    return new Response(JSON.stringify({ id }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
