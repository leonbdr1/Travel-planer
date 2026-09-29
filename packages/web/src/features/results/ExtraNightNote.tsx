// What one night more of the same stay costs (Aufgabe 4): green when the extra
// night is clearly cheaper than the nights before, orange when clearly dearer.
import type { ExtraNightDto } from '@reiseplaner/contracts';
import { cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatEuro } from '../../lib/format';

const t = de.results.extraNight;

export function extraNightText(x: Pick<ExtraNightDto, 'to_nights' | 'extra_eur' | 'nightly_eur' | 'verdict'>): string {
  return t[x.verdict](x.to_nights, formatEuro(x.extra_eur), formatEuro(x.nightly_eur));
}

export function ExtraNightNote({ extra, className }: { extra: ExtraNightDto; className?: string }) {
  return (
    <p
      data-testid="extra-night"
      data-verdict={extra.verdict}
      className={cx(
        'text-sm',
        extra.verdict === 'cheap' && 'font-medium text-emerald-800',
        extra.verdict === 'expensive' && 'font-medium text-orange-800',
        extra.verdict === 'normal' && 'text-zinc-600',
        className,
      )}
    >
      {extra.verdict === 'cheap' ? '▲ ' : extra.verdict === 'expensive' ? '! ' : ''}
      {extraNightText(extra)}
    </p>
  );
}
