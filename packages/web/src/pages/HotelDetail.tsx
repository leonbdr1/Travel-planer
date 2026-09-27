// Hotel detail (F10): description, facilities, all dates and rates of this
// search, cancellation terms, public reference price on demand, score
// breakdown and (M7) review check.
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { HotelDetailResponse } from '@reiseplaner/contracts';
import { Alert, Badge, buttonClasses, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { fetchHotelDetail } from '../features/results/api';
import { ReferencePrice } from '../features/results/ReferencePrice';
import { cancellationText, QualityBadge } from '../features/results/ResultList';
import { ReviewCheckPanel } from '../features/results/ReviewCheckPanel';
import { de } from '../i18n/de';
import { formatEuro, formatEuroCents, formatScore, formatStay } from '../lib/format';
import { useMeta } from '../lib/meta';
import { tokenFromHash } from './SearchRun';

const t = de.detail;
const r = de.results;

function ScoreBreakdown({ score }: { score: HotelDetailResponse['score'] }) {
  if (score.quality === null) return <Text>{t.noScore}</Text>;
  const rows: Array<[string, string]> = [
    [t.scoreRating(formatScore(score.rating ?? 0), score.reviewCount), ''],
    [t.scorePrior(formatScore(score.priorMean), score.priorWeight), score.s0 === null ? '' : formatScore(score.s0)],
    [
      score.recency.checked ? t.scoreRecency : t.scoreRecencyNotChecked,
      score.recency.applied && score.recency.s1 !== null ? formatScore(score.recency.s1) : '–',
    ],
    [t.scoreCleanliness, score.cleanliness.applied && score.cleanliness.value !== null ? formatScore(score.cleanliness.value) : t.scoreCleanlinessNone],
    [t.scorePenalty, score.penalty.total > 0 ? `− ${formatScore(score.penalty.total)}` : '–'],
  ];
  return (
    <dl className="divide-y divide-zinc-100 text-sm" data-testid="score-breakdown">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-zinc-600">{label}</dt>
          <dd className="font-medium tabular-nums text-zinc-900">{value}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 py-2">
        <dt className="font-semibold text-zinc-900">{t.scoreFinal}</dt>
        <dd className="font-bold tabular-nums text-zinc-950">{formatScore(score.quality)}</dd>
      </div>
    </dl>
  );
}

export function HotelDetail() {
  const { id = '', hotelId = '' } = useParams();
  const location = useLocation();
  const token = tokenFromHash(location.hash);
  const meta = useMeta();
  const [data, setData] = useState<HotelDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchHotelDetail(id, token, hotelId, controller.signal)
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(de.searchRun.notFound);
      });
    return () => controller.abort();
  }, [id, hotelId, token]);

  const back = `/suche/${id}#t=${token}`;
  if (error) return <div className="mx-auto max-w-4xl px-4 py-12"><Alert tone="error">{error}</Alert></div>;
  if (!data) return <div className="mx-auto max-w-4xl px-4 py-12"><Spinner label={de.common.loading} /></div>;
  const h = data.hotel;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <Link to={back} className="text-sm font-medium text-brand-700 hover:underline">
        ← {t.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Heading level={1}>{h.name}</Heading>
          <p className="text-sm text-zinc-600">
            {h.stars ? `${'★'.repeat(Math.round(h.stars))} · ` : ''}
            {h.hotel_type ?? ''}
            {h.address ? ` · ${h.address}` : ''}
          </p>
        </div>
        <QualityBadge score={data.score.quality} reviews={h.review_count} />
      </div>
      {h.photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {h.photos.slice(0, 4).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : null}

      <Card className="space-y-3">
        <Heading level={2}>{t.offers}</Heading>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="detail-offers">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2 pr-4 font-medium">{t.date}</th>
                <th className="py-2 pr-4 font-medium">{t.room}</th>
                <th className="py-2 pr-4 font-medium">{t.cancellation}</th>
                <th className="py-2 pr-4 text-right font-medium">{t.price}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {data.offers.map((o) => (
                <tr key={o.id} className={cx('border-t border-zinc-100 align-top', !o.passes_filters && 'text-zinc-400')}>
                  <td className="whitespace-nowrap py-2 pr-4">
                    <div className="font-medium">{formatStay(o.checkin, o.checkout)}</div>
                    <div className="text-xs text-zinc-500">{o.place_name}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <div>{o.room_name}</div>
                    <div className="text-xs text-zinc-500">{r.boardNames[o.board_type]}</div>
                    {o.bargain ? (
                      <div className="mt-1 text-xs font-medium text-emerald-800">
                        <Badge tone="bargain">{r.bargain}</Badge> {o.bargain.reason}
                      </div>
                    ) : null}
                    {!o.passes_filters ? <div className="text-xs">{t.filteredOut}</div> : null}
                  </td>
                  <td className="py-2 pr-4 text-xs">{cancellationText(o.refundable, o.free_cancel_until)}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-right">
                    <div className="font-semibold tabular-nums">{formatEuro(o.total_price_eur)}</div>
                    <div className="text-xs text-zinc-500">{r.perNight(formatEuroCents(o.price_per_night_eur))}</div>
                    <div className="text-xs text-zinc-500">
                      {o.pay_at_property_known
                        ? o.pay_at_property_eur > 0
                          ? r.payAtProperty(formatEuroCents(o.pay_at_property_eur))
                          : ''
                        : r.payAtPropertyUnknown}
                    </div>
                    <div className="mt-1 ml-auto max-w-56 whitespace-normal">
                      <ReferencePrice searchId={id} token={token} hotelId={hotelId} offerId={o.id} />
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      to={`/buchen/${id}/${encodeURIComponent(o.id)}#t=${token}`}
                      className={buttonClasses('primary', 'sm')}
                      data-testid="book-offer"
                    >
                      {t.book}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <Heading level={2}>{t.scoreTitle}</Heading>
          <ScoreBreakdown score={data.score} />
        </Card>
        <ReviewCheckPanel check={data.review_check} aiLabel={meta.status === 'ready' ? (meta.meta.ai_labels.review_analysis ?? '') : ''} />
      </div>

      {h.description ? (
        <Card className="space-y-2">
          <Heading level={2}>{t.description}</Heading>
          <Text className="whitespace-pre-line text-sm">{h.description}</Text>
          {h.checkin_time && h.checkout_time ? <Text className="text-sm">{t.checkinTimes(h.checkin_time, h.checkout_time)}</Text> : null}
        </Card>
      ) : null}
      {h.facilities.length > 0 ? (
        <Card className="space-y-2">
          <Heading level={2}>{t.facilities}</Heading>
          <ul className="flex flex-wrap gap-1.5">
            {h.facilities.map((f) => (
              <li key={f}>
                <Badge>{f}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {h.important_information ? (
        <Alert tone="info" title={t.importantInfo}>
          {h.important_information}
        </Alert>
      ) : null}
    </div>
  );
}
