// Price matrix: places × dates. Cells fill live while the search runs
// (placeholder → price / no offer / no data).
import type { SearchCell } from '@reiseplaner/contracts';
import { cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';

const t = de.searchRun;
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
}

export interface MatrixProps {
  places: Array<{ id: string; name: string; drive_minutes: number | null }>;
  dates: Array<{ checkin: string; checkout: string }>;
  cells: SearchCell[];
  onCell?: (cell: SearchCell) => void;
  highlight?: (cell: SearchCell) => 'bargain' | null;
}

export function Matrix({ places, dates, cells, onCell, highlight }: MatrixProps) {
  const byKey = new Map(cells.map((c) => [`${c.place_id}|${c.checkin}`, c]));
  const prices = cells.filter((c) => c.min_total_eur !== null).map((c) => c.min_total_eur as number);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const bucket = (v: number) => (max === min ? 0 : Math.min(2, Math.floor(((v - min) / (max - min)) * 3)));
  const tones = ['bg-emerald-50 text-emerald-900', 'bg-white text-zinc-900', 'bg-amber-50 text-amber-900'];
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200" data-testid="matrix">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-900">
              {t.place}
            </th>
            {dates.map((d) => (
              <th key={d.checkin} scope="col" className="whitespace-nowrap bg-zinc-50 px-3 py-2 text-right font-medium text-zinc-600">
                {dateLabel(d.checkin)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <tr key={p.id} className="border-t border-zinc-100">
              <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left font-medium text-zinc-900">
                {p.name}
              </th>
              {dates.map((d) => {
                const cell = byKey.get(`${p.id}|${d.checkin}`);
                const state = cell?.state ?? 'pending';
                const mark = cell && highlight ? highlight(cell) : null;
                const content =
                  state === 'pending' ? (
                    <span className="inline-block h-4 w-14 animate-pulse rounded bg-zinc-200" aria-label={t.pending} />
                  ) : state === 'offer' && cell?.min_total_eur !== null && cell ? (
                    t.from(euro.format(cell.min_total_eur))
                  ) : state === 'no_offer' ? (
                    <span className="text-zinc-400">{t.noOffer}</span>
                  ) : (
                    <span className="text-zinc-400">{t.noData}</span>
                  );
                const clickable = state === 'offer' && onCell && cell;
                return (
                  <td
                    key={d.checkin}
                    data-state={state}
                    className={cx(
                      'whitespace-nowrap px-3 py-2 text-right tabular-nums',
                      state === 'offer' && cell?.min_total_eur !== null && cell ? tones[bucket(cell.min_total_eur ?? 0)] : '',
                      mark === 'bargain' && 'font-semibold ring-2 ring-inset ring-emerald-500',
                    )}
                  >
                    {clickable ? (
                      <button type="button" className="hover:underline" onClick={() => onCell(cell)}>
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
