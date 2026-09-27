// S4.1 demo: the dates of the plan's example and the chip mapping, straight
// from packages/domain.
import { productConfig } from '@reiseplaner/config';
import { CHIPS, generateStayDates, isoWeekday } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';

const WEEKDAYS = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const de = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

export async function run(out: DemoOutput): Promise<number> {
  const limits = {
    maxDates: productConfig.limits.search.max_dates,
    maxNights: productConfig.limits.search.max_nights,
    maxWindowDays: productConfig.limits.search.max_window_days,
  };
  out.log('Zeitfenster 01.10.–30.11.2026, 2 Nächte, Anreise Freitag (heute 27.09.2026):');
  const result = generateStayDates(
    { window: { start: '2026-10-01', end: '2026-11-30' }, nights: 2, arrivalWeekdays: [5], today: '2026-09-27' },
    limits,
  );
  if (!result.ok) return 1;
  result.dates.forEach((d, i) => out.log(`  ${String(i + 1).padStart(2)}. ${WEEKDAYS[isoWeekday(d.checkin)]} ${de(d.checkin)} – ${WEEKDAYS[isoWeekday(d.checkout)]} ${de(d.checkout)}`));
  out.log(`→ ${result.dates.length} Termine`);
  const tooMany = generateStayDates(
    { window: { start: '2026-10-01', end: '2026-11-15' }, nights: 2, arrivalWeekdays: [5, 6], today: '2026-09-27' },
    limits,
  );
  out.log(`Freitag und Samstag bis 15.11. → ${tooMany.ok ? 'ok' : `${tooMany.error} (${tooMany.count} Termine, erlaubt ${limits.maxDates})`}`);
  out.log('');
  out.log('Chips und ihre Wirkung:');
  for (const chip of CHIPS) {
    const e = chip.effect;
    const effect =
      e.kind === 'score_cleanliness'
        ? 'Sauberkeitsgewicht 0,2 → 0,35'
        : e.kind === 'noise_double'
          ? 'Lärm-Warnungen zählen doppelt'
          : e.kind === 'board'
            ? `Filter Verpflegung ∈ {${e.boards.join(', ')}}`
            : e.kind === 'refundable'
              ? 'Filter kostenlos stornierbar'
              : `Filter Ausstattungs-ID ${e.anyOf.join(' oder ')}${e.orHotelTypes ? ` oder Unterkunftstyp ${e.orHotelTypes.join('/')}` : ''}`;
    out.log(`  ${chip.code.padEnd(22)} ${chip.label.padEnd(22)} ${effect}`);
  }
  const ok = result.dates.length === 9 && !tooMany.ok && tooMany.error === 'too_many_dates';
  out.log(ok ? '→ 9 Termine wie im Plan, 13 Termine → too_many_dates' : '→ UNEXPECTED');
  return ok ? 0 : 1;
}
