// S8.1 demo: the booking state machine (architektur.md 6.11) as a table of
// every state × event with the resulting state or "verboten", plus the
// decision of `complete` per state.
import { BOOKING_EVENTS, BOOKING_STATES, decideComplete, nextBookingState } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const width = 17;
  out.log(`${'Zustand'.padEnd(11)}${BOOKING_EVENTS.map((e) => e.padEnd(width)).join('')}`);
  let allowed = 0;
  for (const state of BOOKING_STATES) {
    const cells = BOOKING_EVENTS.map((event) => {
      const next = nextBookingState(state, event);
      if (next) allowed += 1;
      return (next ? `→ ${next}` : 'verboten').padEnd(width);
    });
    out.log(`${state.padEnd(11)}${cells.join('')}`);
  }
  out.log('');
  out.log(`${allowed} erlaubte Übergänge, ${BOOKING_STATES.length * BOOKING_EVENTS.length - allowed} verbotene.`);
  out.log('');
  out.log('complete (idempotent):');
  for (const state of BOOKING_STATES) {
    out.log(`  ${state.padEnd(10)} ${decideComplete(state, false, false).action}${state === 'prebooked' ? ` (Preis geändert, unbestätigt: ${decideComplete(state, true, false).action})` : ''}`);
  }
  const ok = allowed === 7;
  out.log(ok ? '→ Zustandsautomat wie architektur.md 6.11' : '→ UNEXPECTED');
  return ok ? 0 : 1;
}
