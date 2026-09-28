// Alarm state machine (architektur.md 15): immediate alert, cooldown for
// reminders, immediate escalation and recovery.
import { describe, expect, it } from 'vitest';
import { nextState, stateChanged, type CheckState } from '../src/alarm';
import { formatDuration } from '../src/format';

const H = 3_600_000;
const t = (h: number) => new Date(Date.parse('2026-09-28T08:00:00Z') + h * H);
const COOLDOWN = 4 * H;
const failing = (detail = 'HTTP 503') => ({ ok: false as const, severity: 'critical' as const, detail });
const ok = { ok: true as const, detail: 'HTTP 200' };

describe('nextState', () => {
  it('alerts at once on a new failure and stays quiet within the cooldown', () => {
    const first = nextState('health', null, failing(), t(0), COOLDOWN);
    expect(first.event).toMatchObject({ kind: 'alert', severity: 'critical', since: t(0).toISOString() });
    const second = nextState('health', first.state, failing(), t(3.99), COOLDOWN);
    expect(second.event).toBeNull();
    expect(stateChanged(first.state, second.state)).toBe(false);
  });

  it('reminds after the cooldown and keeps the start of the failure', () => {
    const first = nextState('health', null, failing(), t(0), COOLDOWN);
    const reminder = nextState('health', first.state, failing('keine Antwort'), t(4), COOLDOWN);
    expect(reminder.event).toMatchObject({ kind: 'reminder', since: t(0).toISOString(), detail: 'keine Antwort' });
    expect(reminder.state.lastAlertAt).toBe(t(4).toISOString());
    expect(nextState('health', reminder.state, failing(), t(7.9), COOLDOWN).event).toBeNull();
  });

  it('escalates from warning to critical at once', () => {
    const warn = nextState('x', null, { ok: false, severity: 'warning', detail: 'alt' }, t(0), COOLDOWN);
    const crit = nextState('x', warn.state, failing(), t(0.25), COOLDOWN);
    expect(crit.event).toMatchObject({ kind: 'alert', severity: 'critical' });
  });

  it('reports recovery immediately with the duration, then stays quiet', () => {
    const first = nextState('health', null, failing(), t(0), COOLDOWN);
    const recovered = nextState('health', first.state, ok, t(4.25), COOLDOWN);
    expect(recovered.event).toMatchObject({ kind: 'recovered', durationMin: 255 });
    expect(recovered.state.status).toBe('ok');
    expect(nextState('health', recovered.state, ok, t(4.5), COOLDOWN).event).toBeNull();
  });

  it('does not alert for a check that was always fine', () => {
    const prev: CheckState | null = null;
    const r = nextState('health', prev, ok, t(0), COOLDOWN);
    expect(r.event).toBeNull();
    expect(stateChanged(r.state, nextState('health', r.state, ok, t(1), COOLDOWN).state)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('uses minutes, hours and days', () => {
    expect(formatDuration(45)).toBe('45 Min.');
    expect(formatDuration(255)).toBe('4 Std. 15 Min.');
    expect(formatDuration(1560)).toBe('26 Std.');
    expect(formatDuration(4320)).toBe('3 Tage');
  });
});
