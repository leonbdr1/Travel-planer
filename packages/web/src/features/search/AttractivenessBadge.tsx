// How much a place or region offers (Aufgabe 8): a small level badge; the "i"
// names the criteria. Places with little to offer are marked, never hidden.
import { Link } from 'react-router';
import type { AttractivenessDto } from '@reiseplaner/contracts';
import { InfoPopover, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatScore } from '../../lib/format';

const t = de.attractiveness;

export const LEVEL_TONE: Record<AttractivenessDto['level'], string> = {
  top: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  beliebt: 'bg-brand-50 text-brand-800 ring-brand-200',
  ruhig: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  wenig: 'bg-orange-50 text-orange-800 ring-orange-200',
};

const PARTS: Array<keyof AttractivenessDto['parts']> = ['fame', 'attractions', 'trails', 'variety', 'infrastructure'];

function Dots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={t.outOf(value)}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx('size-2 rounded-full', i <= value ? 'bg-brand-600' : 'bg-zinc-200')} />
      ))}
    </span>
  );
}

export function AttractivenessBadge({
  level,
  score,
  parts,
  topPlaces,
  name,
}: {
  level: AttractivenessDto['level'];
  score: number;
  parts?: AttractivenessDto['parts'];
  /** For a region: its best places. */
  topPlaces?: readonly string[];
  name: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" data-testid="attractiveness" data-level={level}>
      <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', LEVEL_TONE[level])}>
        {t.levels[level]} · {formatScore(score)}
      </span>
      <InfoPopover label={t.infoLabel(name)} testId="attractiveness-info">
        <span className="block font-semibold text-zinc-900">
          {name}: {t.levels[level]} ({formatScore(score)} / 10)
        </span>
        <span className="mt-1 block text-zinc-600">{topPlaces ? t.regionIntro : t.intro}</span>
        {parts ? (
          <span className="mt-2 block space-y-1">
            {PARTS.map((key) => (
              <span key={key} className="flex items-center justify-between gap-3">
                <span>{t.parts[key]}</span>
                <Dots value={parts[key]} />
              </span>
            ))}
          </span>
        ) : null}
        {topPlaces && topPlaces.length > 0 ? <span className="mt-2 block">{t.topPlaces(topPlaces.join(', '))}</span> : null}
        {level === 'wenig' ? <span className="mt-2 block font-medium text-orange-800">{t.cheapNote}</span> : null}
        <Link to="/ranking#orte" className="mt-2 inline-block font-medium text-brand-700 hover:underline">
          {t.more}
        </Link>
      </InfoPopover>
    </span>
  );
}
