// Result matrix (F9): places × dates, best passing offer per cell, colour by
// price quintile, bargains marked, empty and failed cells distinct; a click
// scopes the list to that combination.
import type { MatrixCellDto } from '@reiseplaner/contracts';
import { cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatDay, formatEuro } from '../../lib/format';

const t = de.results;
const BUCKET = [
  '',
  'bg-emerald-100 text-emerald-950',
  'bg-emerald-50 text-emerald-900',
  'bg-white text-zinc-900',
  'bg-amber-50 text-amber-900',
  'bg-orange-100 text-orange-950',
];

export function PriceMatrix({
  places,
  dates,
  cells,
  selected,
  onSelect,
}: {
  places: Array<{ id: string; name: string }>;
  dates: Array<{ checkin: string }>;
  cells: MatrixCellDto[];
  selected: { place_id: string; checkin: string } | null;
  onSelect: (cell: MatrixCellDto | null) => void;
}) {
  const byKey = new Map(cells.map((c) => [`${c.place_id}|${c.checkin}`, c]));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200" data-testid="result-matrix">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-900">
                {de.searchRun.place}
              </th>
              {dates.map((d) => (
                <th key={d.checkin} scope="col" className="whitespace-nowrap bg-zinc-50 px-3 py-2 text-right font-medium text-zinc-600">
                  {formatDay(d.checkin)}
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
                  const isSelected = selected?.place_id === p.id && selected.checkin === d.checkin;
                  if (!cell || cell.state !== 'offer' || cell.total_price_eur === null) {
                    return (
                      <td key={d.checkin} data-state={cell?.state ?? 'pending'} className="whitespace-nowrap px-3 py-2 text-right text-xs text-zinc-400">
                        {cell?.state === 'failed' ? t.legendFailed : cell?.state === 'pending' ? '…' : '–'}
                      </td>
                    );
                  }
                  return (
                    <td key={d.checkin} data-state="offer" className={cx('p-0 text-right', BUCKET[cell.price_bucket ?? 3])}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelect(isSelected ? null : cell)}
                        className={cx(
                          'w-full whitespace-nowrap px-3 py-2 tabular-nums hover:underline',
                          isSelected && 'ring-2 ring-inset ring-brand-600',
                          cell.bargain && 'font-semibold',
                        )}
                        title={cell.bargain ? t.bargain : undefined}
                      >
                        {cell.bargain ? '★ ' : ''}
                        {formatEuro(cell.total_price_eur)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        {t.matrixHint} ★ = {t.bargain} · – = {t.legendEmpty} · „{t.legendFailed}“ = {t.legendFailedHint}
      </p>
    </div>
  );
}
