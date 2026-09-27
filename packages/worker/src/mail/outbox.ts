// Sending through the outbox (architektur.md 6.12): an e-mail is stored
// first, then sent right away; failures wait with backoff for the cron job
// `outbox-retry`. Logs carry the outbox id and error kind, never addresses.
import { productConfig } from '@reiseplaner/config';
import {
  dueEmails,
  enqueueEmail,
  markEmailAttemptFailed,
  markEmailSent,
  type EmailType,
  type OutboxEmail,
  type Queryable,
} from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';
import { ProviderError, type MailPort } from '@reiseplaner/providers';
import { renderEmail } from './templates';

export interface MailDeps {
  db: Queryable;
  mail: MailPort;
  now: () => Date;
}

const MINUTE_MS = 60_000;

export function sender(): string {
  return `${productConfig.mail.from_name} <${productConfig.mail.from_address}>`;
}

function backoffMinutes(attemptsSoFar: number): number {
  const steps = constants.EMAIL_RETRY_BACKOFF_MIN;
  return steps[Math.min(attemptsSoFar, steps.length - 1)] ?? steps[steps.length - 1] ?? 60;
}

/** One send attempt for an outbox e-mail; the outcome is stored with the e-mail. */
export async function deliverEmail(deps: MailDeps, email: OutboxEmail): Promise<'sent' | 'pending' | 'failed'> {
  try {
    const rendered = renderEmail(email.type, email.payload);
    const { providerMessageId } = await deps.mail.send({
      from: sender(),
      to: email.toEmail,
      replyTo: productConfig.support.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    await markEmailSent(deps.db, email.id, providerMessageId, deps.now());
    return 'sent';
  } catch (err) {
    const kind = err instanceof ProviderError ? `${err.provider}:${err.kind}` : (err as Error).name;
    console.error(JSON.stringify({ level: 'warn', msg: 'e-mail send failed', outbox_id: email.id, type: email.type, error: kind }));
    const next = new Date(deps.now().getTime() + backoffMinutes(email.attempts) * MINUTE_MS);
    return markEmailAttemptFailed(deps.db, email.id, kind, next, constants.EMAIL_MAX_ATTEMPTS);
  }
}

/** Stores the e-mail and tries to send it right away. */
export async function sendViaOutbox(
  deps: MailDeps,
  e: { type: EmailType; toEmail: string; bookingId: string | null; payload: Record<string, unknown> },
): Promise<{ id: string; status: 'sent' | 'pending' | 'failed' }> {
  const stored = await enqueueEmail(deps.db, e);
  return { id: stored.id, status: await deliverEmail(deps, stored) };
}

/** Cron job `outbox-retry`: all due e-mails, one attempt each. */
export async function retryDueEmails(deps: MailDeps): Promise<{ sent: number; pending: number; failed: number }> {
  const result = { sent: 0, pending: 0, failed: 0 };
  for (const email of await dueEmails(deps.db, deps.now(), constants.EMAIL_RETRY_BATCH)) {
    result[await deliverEmail(deps, email)] += 1;
  }
  return result;
}
