// Result matrix (F9): places × dates, cheapest acceptable offer per cell,
// colour by price quintile, bargains marked, empty and failed cells distinct;
// a click scopes the list to that combination. Hovering or focusing a price
// names the house and room behind it and, for a bargain (★), why it is one.
import type { AttractivenessDto, MatrixCellDto } from '@reiseplaner/contracts';
import { Link } from 'react-router';
import { InfoPopover, Tooltip, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { LEVEL_TONE } from '../search/AttractivenessBadge';
import { formatDay, formatEuro, formatStay, hasNightVariants, nightsBetween } from '../../lib/format';

const t = de.results;
const BUCKET = [
  '',
  'bg-emerald-100 text-emerald-950',
  'bg-emerald-50 text-emerald-900',
  'bg-white text-zinc-900',
  'bg-amber-50 text-amber-900',
  'bg-orange-100 text-orange-950',
];

function roomLine(cell: MatrixCellDto): string {
  return [cell.room_name, cell.board_type ? t.boardNames[cell.board_type] : null].filter(Boolean).join(' · ');
}

/** The same text for screen readers as the hover panel shows. */
function cellLabel(cell: MatrixCellDto, place: string): string {
  const parts = [`${place}, ${formatStay(cell.checkin, cell.checkout)}: ${formatEuro(cell.total_price_eur ?? 0)}`, cell.hotel_name, roomLine(cell)];
  if (cell.bargain_reason) parts.push(`${t.bargain}: ${cell.bargain_reason}`);
  return parts.filter(Boolean).join('. ');
}

function CellHint({ cell }: { cell: MatrixCellDto }) {
  return (
    <>
      {cell.hotel_name ? <span className="block font-semibold">{cell.hotel_name}</span> : null}
      {roomLine(cell) ? <span className="block text-zinc-300">{roomLine(cell)}</span> : null}
      {cell.bargain_reason ? (
        <span className="mt-1.5 block text-emerald-300" data-testid="matrix-bargain-reason">
          ★ {t.bargain}: {cell.bargain_reason}
        </span>
      ) : null}
      <span className="mt-1.5 block text-zinc-400">{t.matrixCellHint}</span>
    </>
  );
}

export function PriceMatrix({
  places,
  dates,
  cells,
  selected,
  onSelect,
}: {
  places: Array<{ id: string; name: string; attractiveness?: AttractivenessDto | null }>;
  dates: Array<{ checkin: string; checkout: string }>;
  cells: MatrixCellDto[];
  selected: { place_id: string; checkin: string; checkout: string | null } | null;
  onSelect: (cell: MatrixCellDto | null) => void;
}) {
  const byKey = new Map(cells.map((c) => [`${c.place_id}|${c.checkin}|${c.checkout}`, c]));
  const variants = hasNightVariants(dates);
  const r = de.searchRun;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5" data-testid="matrix-heading">
        <h3 className="text-base font-semibold text-zinc-950">{r.matrixTitle}</h3>
        <InfoPopover label={r.matrixFilterLabel} testId="matrix-filter-info">
          <span className="block font-semibold text-zinc-900">{r.matrixFilterTitle}</span>
          <span className="mt-1 block">{r.matrixFilterText}</span>
          <Link to="/so-filtern-wir" className="mt-2 inline-block font-medium text-brand-700 hover:underline" data-testid="matrix-filter-more">
            {r.matrixFilterMore}
          </Link>
        </InfoPopover>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-zinc-200" data-testid="result-matrix">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-900">
                {de.searchRun.place}
              </th>
              {dates.map((d) => (
                <th key={`${d.checkin}|${d.checkout}`} scope="col" className="whitespace-nowrap bg-zinc-50 px-3 py-2 text-right font-medium text-zinc-600">
                  {formatDay(d.checkin)}
                  {variants ? <span className="block text-xs font-normal text-zinc-500">{de.results.nightsColumn(nightsBetween(d.checkin, d.checkout))}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100">
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left font-medium text-zinc-900">
                  {p.name}
                  {p.attractiveness ? (
                    <Tooltip
                      content={
                        <>
                          <span className="block font-semibold">{de.attractiveness.levels[p.attractiveness.level]}</span>
                          {p.attractiveness.level === 'wenig' ? <span className="block">{de.attractiveness.cheapNote}</span> : null}
                        </>
                      }
                    >
                      <span
                        data-testid="matrix-place-level"
                        data-level={p.attractiveness.level}
                        tabIndex={0}
                        aria-label={de.attractiveness.matrixHint(p.name, de.attractiveness.levels[p.attractiveness.level])}
                        className={cx('mt-0.5 inline-block rounded-full px-1.5 text-[11px] font-medium ring-1 ring-inset', LEVEL_TONE[p.attractiveness.level])}
                      >
                        {de.attractiveness.short[p.attractiveness.level]}
                      </span>
                    </Tooltip>
                  ) : null}
                </th>
                {dates.map((d) => {
                  const cell = byKey.get(`${p.id}|${d.checkin}|${d.checkout}`);
                  const isSelected = selected?.place_id === p.id && selected.checkin === d.checkin && (selected.checkout === null || selected.checkout === d.checkout);
                  if (!cell || cell.state !== 'offer' || cell.total_price_eur === null) {
                    return (
                      <td key={`${d.checkin}|${d.checkout}`} data-state={cell?.state ?? 'pending'} className="whitespace-nowrap px-3 py-2 text-right text-xs text-zinc-400">
                        {cell?.state === 'failed' ? t.legendFailed : cell?.state === 'pending' ? '…' : '–'}
                      </td>
                    );
                  }
                  return (
                    <td key={`${d.checkin}|${d.checkout}`} data-state="offer" data-bargain={cell.bargain || undefined} className={cx('p-0 text-right', BUCKET[cell.price_bucket ?? 3])}>
                      <Tooltip content={<CellHint cell={cell} />}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={cellLabel(cell, p.name)}
                          onClick={() => onSelect(isSelected ? null : cell)}
                          className={cx(
                            'w-full whitespace-nowrap px-3 py-2 text-right tabular-nums hover:underline',
                            isSelected && 'ring-2 ring-inset ring-brand-600',
                            cell.bargain && 'font-semibold',
                          )}
                        >
                          {cell.bargain ? '★ ' : ''}
                          {formatEuro(cell.total_price_eur)}
                        </button>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500" data-testid="matrix-legend">
        {t.matrixHint} ★ = {t.legendBargain} · – = {t.legendEmpty} · „{t.legendFailed}“ = {t.legendFailedHint}
      </p>
    </div>
  );
}
