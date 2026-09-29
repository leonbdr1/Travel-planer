// Hotel detail (F10): description, facilities, all dates and rates of this
// search, cancellation terms, public reference price on demand, score
// breakdown and (M7) review check. Provider texts arrive as plain blocks in
// German where the provider has them; an English one says so.
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { HotelDetailResponse, TextBlockDto } from '@reiseplaner/contracts';
import { constants, extraNights } from '@reiseplaner/domain';
import { Alert, Badge, buttonClasses, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { fetchHotelDetail } from '../features/results/api';
import { ExtraNightNote } from '../features/results/ExtraNightNote';
import { ReferencePrice } from '../features/results/ReferencePrice';
import { cancellationText } from '../features/results/ResultList';
import { RatingPair } from '../features/results/RatingPair';
import { groupOffersByRoom } from '../lib/room-groups';
import { ReviewCheckPanel } from '../features/results/ReviewCheckPanel';
import { de } from '../i18n/de';
import { formatEuro, formatEuroCents, formatScore, formatStay } from '../lib/format';
import { isTestbetrieb, useMeta } from '../lib/meta';
import { tokenFromHash } from './SearchRun';

const t = de.detail;
const r = de.results;

function ScoreBreakdown({ score, sources }: { score: HotelDetailResponse['score']; sources: readonly string[] }) {
  if (score.quality === null) return <Text>{t.noScore}</Text>;
  const rows: Array<[string, string]> = [
    [t.scoreRating(formatScore(score.rating ?? 0), score.reviewCount), ''],
    [
      score.priorWeight > 0
        ? t.scorePrior(formatScore(score.priorMean), Math.round(score.priorWeight), t.kindNames[score.propertyKind], score.fullWeightReviews)
        : t.scoreFullWeight(score.fullWeightReviews, t.kindNames[score.propertyKind]),
      score.s0 === null ? '' : formatScore(score.s0),
    ],
    [
      score.recency.checked ? t.scoreRecency : t.scoreRecencyNotChecked,
      score.recency.applied && score.recency.s1 !== null ? formatScore(score.recency.s1) : '–',
    ],
    [t.scoreCleanliness, score.cleanliness.applied && score.cleanliness.value !== null ? formatScore(score.cleanliness.value) : t.scoreCleanlinessNone],
    [t.scorePenalty, score.penalty.total > 0 ? `− ${formatScore(score.penalty.total)}` : '–'],
    ...(score.penalty.total > 0 && t.scorePenaltyUnit(t.kindNames[score.propertyKind]) ? ([[t.scorePenaltyUnit(t.kindNames[score.propertyKind]), '']] as Array<[string, string]>) : []),
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
      {sources.length > 0 ? (
        <p className="py-2 text-xs text-zinc-600" data-testid="rating-sources-note">
          {t.ratingSourcesNote(sources.join(', '))}
        </p>
      ) : null}
    </dl>
  );
}

/** Provider text as headings, paragraphs and lists; plain text only, never provider markup. */
function ProviderText({ blocks, asList = false }: { blocks: TextBlockDto[]; asList?: boolean }) {
  // Notes such as "A deposit may be required" read best as one list of lines.
  if (asList && blocks.length > 1 && blocks.every((b) => b.kind === 'paragraph')) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {blocks.map((b, i) => (
          <li key={i}>{b.kind === 'paragraph' ? b.text : ''}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.kind === 'heading' ? (
          <h3 key={i} className="pt-1 font-semibold text-zinc-900">
            {b.text}
          </h3>
        ) : b.kind === 'list' ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
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
  const bookingEnabled = meta.status !== 'ready' || meta.meta.booking_enabled;
  // Testbetrieb books nothing; the map search leads to the property's own site and phone.
  const testbetrieb = meta.status === 'ready' && isTestbetrieb(meta.meta);
  const roomGroups = groupOffersByRoom(data.offers);
  // Every room of the house on the searched dates (Aufgabe 5): fitting ones first, each with its lowest price.
  const roomOverview = (() => {
    const rooms = new Map<string, { name: string; minEur: number; capacity: number | null; fit: 'fits' | 'oversized' }>();
    for (const o of data.offers) {
      for (const room of o.room_options) {
        const key = room.room_name.toLocaleLowerCase('de-DE').trim();
        const cur = rooms.get(key);
        if (!cur || room.total_eur < cur.minEur) rooms.set(key, { name: room.room_name, minEur: room.total_eur, capacity: room.capacity, fit: room.fit });
      }
    }
    return [...rooms.values()].sort((a, b) => (a.fit === b.fit ? a.minEur - b.minEur : a.fit === 'fits' ? -1 : 1));
  })();
  // One night more of the same stay (Aufgabe 4), shown at the shorter stay.
  const nightSteps = extraNights(
    data.offers
      .filter((o) => o.passes_filters)
      .map((o) => ({ id: o.id, hotelId: o.hotel_id, roomName: o.room_name, boardType: o.board_type, refundable: o.refundable, checkin: o.checkin, nights: o.nights, totalCents: Math.round(o.total_price_eur * 100) })),
  );
  const town = h.city ?? data.offers[0]?.place_name ?? null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([h.name, h.address, town].filter(Boolean).join(', '))}`;
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
          {testbetrieb && !bookingEnabled ? (
            <p className="text-sm text-zinc-600">
              {de.booking.disabledTestbetrieb}{' '}
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline" data-testid="find-on-map">
                {t.findOnMap} ↗
              </a>
            </p>
          ) : null}
        </div>
        <RatingPair
          quality={{
            score: data.score.quality,
            checked: data.score.recency.checked,
            no_reviews: data.score.quality === null,
            property_kind: data.score.propertyKind,
            full_weight_reviews: data.score.fullWeightReviews,
            prior_applied: data.score.priorWeight > 0,
            recency_delta: data.score.s0 !== null && data.score.recency.applied && data.score.recency.s1 !== null ? data.score.recency.s1 - data.score.s0 : 0,
            cleanliness_delta:
              data.score.cleanliness.applied && data.score.cleanliness.s2 !== null && data.score.recency.s1 !== null ? data.score.cleanliness.s2 - data.score.recency.s1 : 0,
            penalty: data.score.penalty.total,
          }}
          rating={h.rating}
          reviews={h.review_count}
          sources={h.rating_sources}
        />
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
        {roomOverview.length > 0 ? (
          <div className="rounded-lg bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200" data-testid="room-overview">
            <p className="font-medium text-zinc-900">{t.roomOverviewTitle(data.occupancy.adults + data.occupancy.children, data.occupancy.rooms)}</p>
            <ul className="mt-1 space-y-0.5">
              {roomOverview.map((room) => (
                <li key={room.name} className={cx('flex flex-wrap gap-x-2', room.fit === 'oversized' ? 'text-zinc-500' : 'text-zinc-800')} data-fit={room.fit}>
                  <span className="font-medium">{room.name}</span>
                  <span>{t.fromPrice(formatEuro(room.minEur))}</span>
                  {room.capacity !== null ? <span className="text-zinc-500">· {t.roomCapacity(room.capacity)}</span> : null}
                  {room.fit === 'oversized' ? <span className="text-zinc-500">· {t.roomOversizedShort}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-zinc-500">{t.roomOverviewNote}</p>
          </div>
        ) : null}
        {roomGroups.map((group) => (
          <div key={group.key} className="space-y-2">
            <h3 className="text-base font-semibold text-zinc-950" data-testid="detail-room-name">
              {group.name} <span className="text-sm font-normal text-zinc-500">· {t.fromPrice(formatEuro(group.minTotalEur))}</span>
            </h3>
        <div className="overflow-x-auto" data-testid="detail-room-group" data-room={group.name}>
          <table className="min-w-full text-sm" data-testid="detail-offers">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2 pr-4 font-medium">{t.date}</th>
                <th className="py-2 pr-4 font-medium">{t.boardAndRate}</th>
                <th className="py-2 pr-4 font-medium">{t.cancellation}</th>
                <th className="py-2 pr-4 text-right font-medium">{t.price}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {group.offers.map((o) => (
                <tr key={o.id} className={cx('border-t border-zinc-100 align-top', !o.passes_filters && 'text-zinc-400')}>
                  <td className="whitespace-nowrap py-2 pr-4">
                    <div className="font-medium">{formatStay(o.checkin, o.checkout)}</div>
                    <div className="text-xs text-zinc-500">{o.place_name}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="text-xs text-zinc-500">{r.boardNames[o.board_type]}</div>
                    {o.bargain ? (
                      <div className="mt-1 text-xs font-medium text-emerald-800">
                        <Badge tone="bargain">{r.bargain}</Badge> {o.bargain.reason}
                      </div>
                    ) : null}
                    {o.room_fit === 'oversized' ? (
                      <div className="text-xs" data-testid="detail-room-oversized">
                        {r.roomOversized(o.room_capacity)}
                      </div>
                    ) : !o.passes_filters ? (
                      <div className="text-xs">{t.filteredOut}</div>
                    ) : null}
                    {(() => {
                      const step = nightSteps.get(o.id);
                      return step && step.fromNights === o.nights ? (
                        <ExtraNightNote
                          className="mt-1 text-xs"
                          extra={{
                            from_nights: step.fromNights,
                            to_nights: step.toNights,
                            longer_offer_id: step.longerOfferId,
                            extra_eur: step.extraCents / 100,
                            nightly_eur: step.nightlyCents / 100,
                            verdict: step.verdict,
                          }}
                        />
                      ) : null;
                    })()}
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
                    {bookingEnabled ? (
                      <Link
                        to={`/buchen/${id}/${encodeURIComponent(hotelId)}/${encodeURIComponent(o.id)}#t=${token}`}
                        className={buttonClasses('primary', 'sm')}
                        data-testid="book-offer"
                      >
                        {t.book}
                      </Link>
                    ) : testbetrieb ? null : (
                      <span className="text-xs text-zinc-500">{de.booking.disabled}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </div>
        ))}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <Heading level={2}>{t.scoreTitle}</Heading>
          <ScoreBreakdown score={data.score} sources={h.rating_sources} />
        </Card>
        <ReviewCheckPanel check={data.review_check} aiLabel={meta.status === 'ready' ? (meta.meta.ai_labels.review_analysis ?? '') : ''} />
      </div>

      {h.description.length > 0 ? (
        <Card className="space-y-2" data-testid="hotel-description">
          <Heading level={2}>{t.description}</Heading>
          <div className="text-sm text-zinc-700">
            <ProviderText blocks={h.description} />
          </div>
          {h.description_language === 'en' ? <p className="text-xs text-zinc-500">{t.onlyEnglish}</p> : null}
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
      {h.important_information.length > 0 ? (
        <Alert tone="info" title={t.importantInfo}>
          <div data-testid="important-information">
            <ProviderText blocks={h.important_information} asList />
            {h.important_information_language === 'en' ? <p className="mt-2 text-xs opacity-80">{t.onlyEnglish}</p> : null}
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
