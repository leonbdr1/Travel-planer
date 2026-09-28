// The checks of one watchdog run: the app's health endpoint (critical) and
// the age of each heartbeat job (warning).
import { z } from 'zod';
import type { CheckResult } from './alarm';
import type { FetchFn } from './env';
import { formatDuration } from './format';

const healthBodySchema = z.looseObject({ status: z.string() });

export const heartbeatSchema = z.object({
  at: z.iso.datetime(),
  detail: z.record(z.string(), z.union([z.number(), z.string()])),
});
export type Heartbeat = z.infer<typeof heartbeatSchema>;

export async function checkHealth(url: string, fetchFn: FetchFn, timeoutS: number): Promise<CheckResult> {
  let res: Response;
  try {
    res = await fetchFn(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutS * 1000) });
  } catch (err) {
    const name = (err as Error).name;
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return { ok: false, severity: 'critical', detail: timedOut ? `keine Antwort innerhalb von ${timeoutS} s` : 'nicht erreichbar' };
  }
  if (res.status !== 200) {
    await res.body?.cancel().catch(() => undefined);
    return { ok: false, severity: 'critical', detail: `HTTP ${res.status}` };
  }
  const body = healthBodySchema.safeParse(await res.json().catch(() => null));
  if (!body.success) return { ok: false, severity: 'critical', detail: 'unerwartete Antwort' };
  if (body.data.status !== 'ok') return { ok: false, severity: 'critical', detail: `Status „${body.data.status}“` };
  return { ok: true, detail: 'HTTP 200' };
}

/** A job that never reported counts from the moment the watchdog started watching. */
export function checkHeartbeat(beat: Heartbeat | null, now: Date, maxAgeMin: number, watchingSince: Date): CheckResult {
  const reference = beat ? Date.parse(beat.at) : watchingSince.getTime();
  const ageMin = Math.max(0, Math.floor((now.getTime() - reference) / 60_000));
  if (ageMin <= maxAgeMin) return { ok: true, detail: beat ? `letzter Heartbeat ist ${formatDuration(ageMin)} alt` : 'noch kein Heartbeat, Frist läuft' };
  return {
    ok: false,
    severity: 'warning',
    detail: beat
      ? `letzter Heartbeat ist ${formatDuration(ageMin)} alt (erlaubt: ${formatDuration(maxAgeMin)})`
      : `seit Start des Watchdogs vor ${formatDuration(ageMin)} kein Heartbeat`,
  };
}
