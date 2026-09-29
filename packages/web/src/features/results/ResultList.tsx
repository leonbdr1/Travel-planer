// Result list (F10, F17): every hotel once with its best offer: name, place,
// dates, total price, quality, praise labels, bargain reason, warnings,
// cancellation. Houses without reviews that the goal's rules sort out come in
// a second list with the doubt (why they are not in our selection).
import { Link } from 'react-router';
import type { ResultItem, UnratedDoubtDto } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { AiLabel, Badge, Card, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatDateTime, formatEuro, formatEuroCents, formatScore, formatStay } from '../../lib/format';
import { ExtraNightNote } from './ExtraNightNote';
import { PraiseLabels } from './PraiseLabels';

const t = de.results;
const rc = de.reviewCheck;

export function cancellationText(refundable: boolean, until: string | null): string {
  if (!refundable) return t.nonRefundable;
  return until ? t.refundableUntil(formatDateTime(until)) : t.refundable_;
}

export function QualityBadge({ score, reviews, sources = [] }: { score: number | null; reviews: number | null; sources?: readonly string[] }) {
  if (score === null) return <span className="text-sm text-zinc-500">{t.noReviews}</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="rounded-md bg-brand-700 px-1.5 py-0.5 text-sm font-bold text-white tabular-nums">{formatScore(score)}</span>
      {reviews !== null ? (
        <span className="text-xs text-zinc-500" data-testid={sources.length > 0 ? 'rating-sources' : undefined}>
          {t.reviews(reviews)}
          {sources.length > 0 ? ` ${t.ratingSources(sources.join(', '))}` : ''}
        </span>
      ) : null}
    </span>
  );
}

export function doubtText(doubt: UnratedDoubtDto): string {
  const reference = doubt.reference_per_night_eur === null ? '' : formatEuro(doubt.reference_per_night_eur);
  if (doubt.code === 'cheap') return t.doubt.cheap(reference);
  if (doubt.code === 'extras') return t.doubt.extras(reference);
  return t.doubt[doubt.code];
}

export function ResultList({
  items,
  detailHref,
  aiLabel,
  testId = 'result-list',
}: {
  items: Array<ResultItem & { doubt?: UnratedDoubtDto }>;
  detailHref: (hotelId: string) => string;
  aiLabel: string;
  testId?: string;
}) {
  return (
    <ol className="space-y-3" data-testid={testId}>
      {items.map((item) => {
        const o = item.best_offer;
        return (
          <li key={item.hotel.id}>
            <Card className={cx('flex flex-col gap-4 sm:flex-row', o.bargain && 'ring-2 ring-emerald-500')}>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={detailHref(item.hotel.id)} className="text-lg font-semibold text-zinc-950 hover:underline" data-testid="result-name">
                    {item.hotel.name}
                  </Link>
                  {item.hotel.stars ? <span className="text-sm text-amber-600">{'★'.repeat(Math.round(item.hotel.stars))}</span> : null}
                  <QualityBadge score={item.quality.score} reviews={item.hotel.review_count} sources={item.hotel.rating_sources} />
                  {item.recommended ? (
                    <Badge tone="brand" data-testid="recommended">
                      {t.recommended}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-600">
                  {o.place_name} · {formatStay(o.checkin, o.checkout)}
                  {item.other_dates_count > 0 ? ` · ${t.otherDates(item.other_dates_count)}` : ''}
                </p>
                <p className="text-sm text-zinc-600">
                  {o.room_name} · {t.boardNames[o.board_type]} · {cancellationText(o.refundable, o.free_cancel_until)}
                </p>
                {item.extra_night ? <ExtraNightNote extra={item.extra_night} /> : null}
                {o.room_fit === 'oversized' ? (
                  <p className="text-sm text-zinc-600" data-testid="room-oversized">
                    {t.roomOversized(o.room_capacity)}
                  </p>
                ) : null}
                <PraiseLabels labels={item.labels} max={constants.PRAISE_MAX_LABELS_LIST} />
                {item.doubt ? (
                  <p className="text-sm text-amber-800" data-testid="unrated-doubt" data-code={item.doubt.code}>
                    {doubtText(item.doubt)}
                  </p>
                ) : null}
                {o.bargain ? (
                  <p className="text-sm" data-testid="bargain-reason">
                    <Badge tone="bargain">{t.bargain}</Badge> <span className="font-medium text-emerald-800">{o.bargain.reason}</span>
                  </p>
                ) : null}
                {item.warnings.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5" data-testid="result-warnings">
                    {item.warnings.map((w) => (
                      <Badge key={w.topic} tone={w.verified ? 'warning' : 'neutral'}>
                        {w.label}: {rc.mentionsShort(w.count, w.recent_count, constants.REVIEW_RECENT_MONTHS_LABEL)}
                        {w.verified ? '' : ` · ${rc.unverified}`}
                      </Badge>
                    ))}
                    {item.warnings.some((w) => w.ai_provenance === 'ai_assisted') ? <AiLabel text={aiLabel} /> : null}
                  </div>
                ) : item.review_status === 'ok' && item.reviews_checked !== null ? (
                  <p className="text-xs text-zinc-500" data-testid="result-review-ok">
                    {rc.listNoIssues}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
                <span className="text-xs uppercase tracking-wide text-zinc-500">{t.total}</span>
                <span className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="result-total" data-total-eur={o.total_price_eur}>
                  {formatEuro(o.total_price_eur)}
                </span>
                <span className="text-xs text-zinc-500">{t.perNight(formatEuroCents(o.price_per_night_eur))}</span>
                <span className="max-w-56 text-xs text-zinc-500">
                  {o.pay_at_property_known
                    ? o.pay_at_property_eur > 0
                      ? t.payAtProperty(formatEuroCents(o.pay_at_property_eur))
                      : ''
                    : t.payAtPropertyUnknown}
                </span>
                <Link to={detailHref(item.hotel.id)} className="mt-1 text-sm font-semibold text-brand-700 hover:underline">
                  {t.details}
                </Link>
              </div>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
