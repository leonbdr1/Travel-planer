// Maintenance jobs (architektur.md 6.4 step 10, 6.12): hourly cleanup of
// expired data; daily retention periods, review invitations, the
// look-to-book watch with automatic throttling and budget warnings.
import { z } from 'zod';
import { productConfig } from '@reiseplaner/config';
import {
  applyRetention,
  budgetStatus,
  deleteExpired,
  deleteSetting,
  dueReviewInvites,
  getSetting,
  lookToBookRatio,
  markReviewInviteSent,
  setSetting,
  type Queryable,
} from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';
import type { MailPort } from '@reiseplaner/providers';
import { sendViaOutbox } from '../mail/outbox';

export interface MaintenanceDeps {
  db: Queryable;
  mail: MailPort;
  now: () => Date;
}

export const SEARCH_MAX_COMBINATIONS_KEY = 'search_max_combinations_override';
const overrideSchema = z.object({ value: z.number().int().positive(), ratio: z.number(), since: z.string() });

/** Maximum combinations for new searches: the configured one, lowered while the watch throttles. */
export async function effectiveMaxCombinations(db: Queryable): Promise<number> {
  const configured = productConfig.limits.search.max_combinations;
  try {
    const override = await getSetting(db, SEARCH_MAX_COMBINATIONS_KEY, overrideSchema);
    return override ? Math.min(configured, override.value) : configured;
  } catch {
    return configured;
  }
}

export async function runCacheCleanup(deps: MaintenanceDeps) {
  return deleteExpired(deps.db, deps.now(), constants.TRAVEL_TIME_CACHE_TTL_DAYS);
}

async function alert(deps: MaintenanceDeps, severity: 'warning' | 'critical' | 'resolved', title: string, lines: string[]) {
  await sendViaOutbox(deps, { type: 'ops_alert', toEmail: productConfig.ops.alert_email, bookingId: null, payload: { title, severity, lines } });
}

export interface DailyResult {
  retention: Awaited<ReturnType<typeof applyRetention>>;
  invitesSent: number;
  lookToBook: { ratio: number; state: 'ok' | 'alert' | 'throttled'; maxCombinations: number };
  budgetWarnings: string[];
}

export async function runDaily(deps: MaintenanceDeps): Promise<DailyResult> {
  const now = deps.now();
  const today = now.toISOString().slice(0, 10);
  const r = productConfig.compliance.retention;
  const retention = await applyRetention(deps.db, now, {
    searchesDays: r.searches_days,
    ipHashDays: r.ip_hash_days,
    guestDataDaysAfterCheckout: r.guest_data_days_after_checkout,
  });

  // Review invitations from the day after checkout.
  let invitesSent = 0;
  for (const invite of await dueReviewInvites(deps.db, today, constants.REVIEW_INVITE_MAX_DELAY_DAYS)) {
    if (!(await markReviewInviteSent(deps.db, invite.bookingId, now))) continue;
    await sendViaOutbox(deps, {
      type: 'review_invite',
      toEmail: invite.email,
      bookingId: invite.bookingId,
      payload: { bookingRef: invite.bookingRef, hotelName: invite.hotelName, checkout: invite.checkout },
    });
    invitesSent += 1;
  }

  // Look-to-book watch: alert from LOOK_TO_BOOK_ALERT, throttle new searches
  // from LOOK_TO_BOOK_THROTTLE, lift the throttle once below the alert level.
  const ratio = Math.round(await lookToBookRatio(deps.db, constants.LOOK_TO_BOOK_WINDOW_DAYS));
  const current = await getSetting(deps.db, SEARCH_MAX_COMBINATIONS_KEY, overrideSchema);
  let state: DailyResult['lookToBook']['state'] = 'ok';
  const window = `${constants.LOOK_TO_BOOK_WINDOW_DAYS} Tage`;
  if (ratio >= constants.LOOK_TO_BOOK_THROTTLE) {
    state = 'throttled';
    await setSetting(deps.db, SEARCH_MAX_COMBINATIONS_KEY, { value: constants.LOOK_TO_BOOK_THROTTLED_MAX_COMBINATIONS, ratio, since: current?.since ?? now.toISOString() });
    await alert(deps, 'critical', 'Such-zu-Buchungs-Verhältnis über der Drosselschwelle', [
      `Verhältnis ${ratio} : 1 über ${window} (Drosselung ab ${constants.LOOK_TO_BOOK_THROTTLE} : 1, Alarm ab ${constants.LOOK_TO_BOOK_ALERT} : 1).`,
      `Neue Suchen sind auf höchstens ${constants.LOOK_TO_BOOK_THROTTLED_MAX_COMBINATIONS} Kombinationen begrenzt (sonst ${productConfig.limits.search.max_combinations}).`,
      'Die Drosselung endet automatisch, sobald das Verhältnis unter die Alarmschwelle fällt.',
    ]);
  } else if (ratio >= constants.LOOK_TO_BOOK_ALERT) {
    state = 'alert';
    await alert(deps, 'warning', 'Such-zu-Buchungs-Verhältnis über der Alarmschwelle', [
      `Verhältnis ${ratio} : 1 über ${window} (Alarm ab ${constants.LOOK_TO_BOOK_ALERT} : 1, Drosselung ab ${constants.LOOK_TO_BOOK_THROTTLE} : 1).`,
    ]);
  } else if (current) {
    await deleteSetting(deps.db, SEARCH_MAX_COMBINATIONS_KEY);
    await alert(deps, 'resolved', 'Such-zu-Buchungs-Drosselung aufgehoben', [`Verhältnis ${ratio} : 1 über ${window}.`]);
  }

  // Budget warnings from BUDGET_WARN_RATIO of a daily cap.
  const budgetWarnings: string[] = [];
  for (const b of await budgetStatus(deps.db, today)) {
    const used = Number(b.reserved) + Number(b.settled);
    if (b.cap > 0 && used / b.cap >= constants.BUDGET_WARN_RATIO) budgetWarnings.push(`${b.scope}: ${Math.round((used / b.cap) * 100)} % von ${b.cap}`);
  }
  if (budgetWarnings.length > 0) await alert(deps, 'warning', 'Tagesbudgets fast ausgeschöpft', budgetWarnings);

  return { retention, invitesSent, lookToBook: { ratio, state, maxCombinations: await effectiveMaxCombinations(deps.db) }, budgetWarnings };
}
