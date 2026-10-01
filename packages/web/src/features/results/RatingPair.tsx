// Guest rating and our score side by side (Aufgabe 7), like travel portals
// show a score with its explanation behind a small "i": the guests' average
// as it is, our value next to it, and on hover why the two differ for this
// house (few reviews for its kind, recent reviews, cleanliness, complaints).
import { Link } from 'react-router';
import type { ResultItem, WarningDto } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { InfoPopover, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatDate, formatScore, formatSignedScore } from '../../lib/format';

const t = de.rating;
const NOTICEABLE = 0.05;

export function ratingReasons(q: ResultItem['quality'], reviews: number | null): string[] {
  const out: string[] = [];
  if (q.prior_applied) out.push(t.fewReviews(t.kindPlural[q.property_kind], q.full_weight_reviews, reviews ?? 0, formatScore(constants.SCORE_PRIOR_MEAN)));
  if (Math.abs(q.recency_delta) >= NOTICEABLE) out.push(q.recency_delta < 0 ? t.recentWorse(formatSignedScore(q.recency_delta)) : t.recentBetter(formatSignedScore(q.recency_delta)));
  if (Math.abs(q.cleanliness_delta) >= NOTICEABLE) out.push(t.cleanliness(formatSignedScore(q.cleanliness_delta)));
  if (q.penalty > 0) out.push(t.penalty(formatSignedScore(-q.penalty)));
  return out;
}

/** One line per complaint behind the deduction: what, how often, when last, how much. */
export function penaltyLines(q: ResultItem['quality'], warnings: readonly WarningDto[]): string[] {
  return q.penalty_items.map((item) => {
    const w = warnings.find((x) => x.topic === item.topic);
    return t.penaltyItem(
      w?.label ?? item.topic,
      w?.count ?? 0,
      w?.latest_date ? formatDate(w.latest_date.slice(0, 10)) : null,
      formatSignedScore(-item.weight),
    );
  });
}

export function RatingPair({
  quality,
  rating,
  reviews,
  sources = [],
  warnings = [],
  size = 'md',
}: {
  quality: ResultItem['quality'];
  /** Guest rating 0–10 (fused with other sources where there are). */
  rating: number | null;
  reviews: number | null;
  sources?: readonly string[];
  /** Complaints of this house, to name the ones behind the deduction. */
  warnings?: readonly WarningDto[];
  size?: 'sm' | 'md';
}) {
  if (quality.score === null || rating === null) return <span className="text-sm text-zinc-500">{de.results.noReviews}</span>;
  const reasons = ratingReasons(quality, reviews);
  const defects = penaltyLines(quality, warnings);
  const same = Math.abs(quality.score - rating) < NOTICEABLE;
  const badge = size === 'sm' ? 'px-1 py-0.5 text-xs' : 'px-1.5 py-0.5 text-sm';
  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1" data-testid="rating-pair" data-guest={rating} data-ours={quality.score} data-penalty={quality.penalty}>
      <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5" title={t.guestTitle}>
        <span className={cx('rounded-md font-bold text-brand-800 ring-1 ring-brand-700 tabular-nums', badge)} data-testid="guest-rating">
          {formatScore(rating)}
        </span>
        <span className="text-xs text-zinc-500" data-testid={sources.length > 0 ? 'rating-sources' : undefined}>
          {t.guests(reviews ?? 0)}
          {sources.length > 0 ? ` ${de.results.ratingSources(sources.join(', '))}` : ''}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cx('rounded-md bg-brand-700 font-bold text-white tabular-nums', badge)} data-testid="our-rating">
          {formatScore(quality.score)}
        </span>
        <span className="text-xs font-medium text-zinc-700">{t.ours}</span>
        <InfoPopover label={t.infoLabel} testId="rating-info">
          <span className="block font-semibold text-zinc-900">
            {same ? t.sameTitle : t.diffTitle(formatScore(quality.score), formatScore(rating))}
          </span>
          <span className="mt-1 block text-zinc-600">{t.intro}</span>
          {reasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {reasons.map((r) => (
                <li key={r}>
                  {r}
                  {r.startsWith(t.penaltyPrefix) && defects.length > 0 ? (
                    <ul className="mt-1 list-[circle] space-y-0.5 pl-4" data-testid="rating-defects">
                      {defects.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <span className="mt-2 block">{t.enough}</span>
          )}
          <Link to="/ranking" className="mt-2 inline-block font-medium text-brand-700 hover:underline">
            {t.more}
          </Link>
        </InfoPopover>
      </span>
    </span>
  );
}
