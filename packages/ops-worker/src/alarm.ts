// Alarm state machine per check (architektur.md 15): a new failure alerts at
// once, a lasting one is repeated after the cooldown at the earliest, an
// escalation (warning → critical) alerts at once, and recovery is reported
// immediately.
import { z } from 'zod';

export type Severity = 'critical' | 'warning';
export type CheckResult = { ok: true; detail: string } | { ok: false; severity: Severity; detail: string };

export const checkStateSchema = z.object({
  status: z.enum(['ok', 'failing']),
  severity: z.enum(['critical', 'warning']).nullable(),
  since: z.iso.datetime(),
  lastAlertAt: z.iso.datetime().nullable(),
  detail: z.string(),
});
export type CheckState = z.infer<typeof checkStateSchema>;

export interface AlarmEvent {
  check: string;
  kind: 'alert' | 'reminder' | 'recovered';
  severity: Severity | null;
  detail: string;
  /** Start of the failure. */
  since: string;
  /** Recovered: how long the failure lasted. */
  durationMin?: number;
}

const rank = (s: Severity | null) => (s === 'critical' ? 2 : s === 'warning' ? 1 : 0);

export function nextState(
  check: string,
  prev: CheckState | null,
  result: CheckResult,
  now: Date,
  cooldownMs: number,
): { state: CheckState; event: AlarmEvent | null } {
  const at = now.toISOString();
  if (result.ok) {
    if (prev?.status === 'failing') {
      const durationMin = Math.round((now.getTime() - Date.parse(prev.since)) / 60_000);
      return {
        state: { status: 'ok', severity: null, since: at, lastAlertAt: null, detail: result.detail },
        event: { check, kind: 'recovered', severity: null, detail: result.detail, since: prev.since, durationMin },
      };
    }
    return { state: { status: 'ok', severity: null, since: prev?.since ?? at, lastAlertAt: null, detail: result.detail }, event: null };
  }
  if (!prev || prev.status === 'ok') {
    return {
      state: { status: 'failing', severity: result.severity, since: at, lastAlertAt: at, detail: result.detail },
      event: { check, kind: 'alert', severity: result.severity, detail: result.detail, since: at },
    };
  }
  const escalated = rank(result.severity) > rank(prev.severity);
  const cooled = !prev.lastAlertAt || now.getTime() - Date.parse(prev.lastAlertAt) >= cooldownMs;
  if (escalated || cooled) {
    return {
      state: { ...prev, severity: result.severity, lastAlertAt: at, detail: result.detail },
      event: { check, kind: escalated ? 'alert' : 'reminder', severity: result.severity, detail: result.detail, since: prev.since },
    };
  }
  return { state: { ...prev, severity: result.severity, detail: result.detail }, event: null };
}

/** Whether a new state must be stored (the detail alone changes every run). */
export function stateChanged(prev: CheckState | null, next: CheckState): boolean {
  return !prev || prev.status !== next.status || prev.severity !== next.severity || prev.since !== next.since || prev.lastAlertAt !== next.lastAlertAt;
}
