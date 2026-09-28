// Alert e-mail of the watchdog: one message per run with all transitions,
// sent through Resend's HTTP API (architektur.md 15). Without an API key the
// message is only logged locally; staging and production count that as a
// failed delivery, so the transition is retried with the next run.
import { productConfig } from '@reiseplaner/config';
import type { AlarmEvent } from './alarm';
import type { FetchFn, OpsEnv } from './env';
import { formatDuration, formatTime } from './format';

export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const MAIL_TIMEOUT_MS = 10_000;

export interface AlertMail {
  subject: string;
  text: string;
}
export type MailOutcome = 'sent' | 'logged' | 'failed';

export function checkLabel(check: string): string {
  if (check === 'health') return 'Health-Check der App';
  if (check.startsWith('heartbeat:')) return `Heartbeat „${check.slice('heartbeat:'.length)}“`;
  return check;
}

export function renderAlertMail(events: AlarmEvent[], now: Date, healthUrl: string): AlertMail {
  const problems = events.filter((e) => e.kind !== 'recovered');
  const worst = problems.some((e) => e.severity === 'critical') ? 'critical' : problems.length ? 'warning' : null;
  const prefix = worst === 'critical' ? '[KRITISCH]' : worst === 'warning' ? '[WARNUNG]' : '[WIEDER IN ORDNUNG]';
  const lead = problems.find((e) => e.severity === worst) ?? events[0];
  const more = events.length - 1;
  const subject = `${prefix} ${productConfig.name}: ${lead ? checkLabel(lead.check) : 'Watchdog'}${more > 0 ? ` und ${more} weitere Meldung${more > 1 ? 'en' : ''}` : ''}`;
  const lines = events.map((e) => {
    const label = checkLabel(e.check);
    if (e.kind === 'recovered') return `WIEDER IN ORDNUNG: ${label} – ${e.detail}, Störung dauerte ${formatDuration(e.durationMin ?? 0)}`;
    const level = e.severity === 'critical' ? 'KRITISCH' : 'WARNUNG';
    return `${level}${e.kind === 'reminder' ? ' (weiterhin)' : ''}: ${label} – ${e.detail}, seit ${formatTime(e.since)}`;
  });
  const text = [
    `Watchdog ${productConfig.name}, Prüfung am ${formatTime(now)}`,
    '',
    ...lines,
    '',
    `Eine anhaltende Störung meldet der Watchdog frühestens nach ${productConfig.ops.alert_cooldown_hours} Stunden erneut; die Entwarnung kommt sofort.`,
    `Health-Endpunkt: ${healthUrl}`,
    '',
  ].join('\n');
  return { subject, text };
}

export async function sendAlertMail(mail: AlertMail, env: Pick<OpsEnv, 'RESEND_API_KEY' | 'OPS_ENV'>, fetchFn: FetchFn): Promise<MailOutcome> {
  if (!env.RESEND_API_KEY) {
    const local = env.OPS_ENV === 'dev' || env.OPS_ENV === 'test';
    console.log(JSON.stringify({ level: local ? 'info' : 'error', msg: local ? 'alert mail not sent (local)' : 'alert mail not sent: RESEND_API_KEY missing', subject: mail.subject }));
    return local ? 'logged' : 'failed';
  }
  try {
    const res = await fetchFn(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `${productConfig.mail.from_name} Watchdog <${productConfig.mail.from_address}>`,
        to: [productConfig.ops.alert_email],
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
    });
    await res.body?.cancel().catch(() => undefined);
    if (res.ok) return 'sent';
    console.error(JSON.stringify({ level: 'error', msg: 'alert mail failed', status: res.status }));
    return 'failed';
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'alert mail failed', name: (err as Error).name }));
    return 'failed';
  }
}
