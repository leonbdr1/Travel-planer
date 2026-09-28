// Finale (F15, F16): the goal switch, what the program sorted out and why,
// and at most four finalists side by side, the cheapest first. Every other
// finalist shows its surcharge and what it brings or lacks. No
// recommendation: whether the sauna is worth 10 € is the traveller's call.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { exclusionReasonSchema, type ExclusionReasonCode, type FinaleResponse, type FinalistDto, type OfferFeatureDto } from '@reiseplaner/contracts';
import { constants, DEFAULT_GOAL, type Goal } from '@reiseplaner/domain';
import { Alert, Badge, Card, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { GoalSwitch } from '../../components/GoalSwitch';
import { de } from '../../i18n/de';
import { formatEuro, formatKm, formatSignedScore, formatStay } from '../../lib/format';
import { fetchFinale, type ResultsParams } from './api';
import { PraiseLabels } from './PraiseLabels';
import { cancellationText, QualityBadge } from './ResultList';

const t = de.finale;

// Four finalists as 2 × 2: the comparison lines need the width.
const GRID: Record<number, string> = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2' };

/** The first FINALE_FEATURES_SHOWN differences, the rest on request (not overwhelming). */
function FeatureList({ features }: { features: readonly OfferFeatureDto[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? features : features.slice(0, constants.FINALE_FEATURES_SHOWN);
  const hidden = features.length - shown.length;
  return (
    <>
      {shown.map((x) => x.label).join(' · ')}
      {hidden > 0 ? (
        <>
          {' · '}
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setAll(true)} data-testid="more-features">
            {t.moreFeatures(hidden)}
          </button>
        </>
      ) : null}
    </>
  );
}

function reasonText(reason: ExclusionReasonCode, n: number): string {
  return reason === 'star_trap' ? t.excluded.star_trap(n, constants.STAR_TRAP_MIN_STARS) : t.excluded[reason](n);
}

function Excluded({ excluded }: { excluded: FinaleResponse['excluded'] }) {
  const reasons = exclusionReasonSchema.options.filter((r) => excluded[r] > 0);
  const total = reasons.reduce((sum, r) => sum + excluded[r], 0);
  if (total === 0) return <p className="text-sm text-zinc-500">{t.excludedNone}</p>;
  return (
    <details className="text-sm text-zinc-600" data-testid="excluded">
      <summary className="cursor-pointer font-medium text-zinc-800">{t.excludedTitle(total)}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {reasons.map((r) => (
          <li key={r} data-reason={r}>
            {reasonText(r, excluded[r])}
          </li>
        ))}
      </ul>
    </details>
  );
}

function locationLine(f: FinalistDto): string | null {
  if (f.location === null) return null;
  const where = t.location[f.location];
  return f.location !== 'kern' && f.center_distance_km !== null ? `${where} · ${t.distance(formatKm(f.center_distance_km))}` : where;
}

function Comparison({ f }: { f: FinalistDto }) {
  const extras = [
    ...(f.quality_delta !== null ? [t.qualityDelta(formatSignedScore(f.quality_delta))] : []),
    ...(f.other_place ? [t.otherPlace(f.offer.place_name)] : []),
    ...(f.other_dates ? [t.otherDates(formatStay(f.offer.checkin, f.offer.checkout))] : []),
  ];
  return (
    <div className="space-y-1 rounded-md bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200" data-testid="comparison">
      {f.gains.length > 0 ? (
        <p data-testid="gains">
          <span className="font-semibold text-emerald-800">{t.brings}:</span> <FeatureList features={f.gains} />
        </p>
      ) : null}
      {f.losses.length > 0 ? (
        <p data-testid="losses">
          <span className="font-semibold text-zinc-800">{t.lacks}:</span> <FeatureList features={f.losses} />
        </p>
      ) : null}
      {f.gains.length === 0 && f.losses.length === 0 ? <p className="text-zinc-600">{t.noDifference}</p> : null}
      {extras.length > 0 ? <p className="text-zinc-600">{extras.join(' · ')}</p> : null}
    </div>
  );
}

function FinalistCard({ f, baseName, isBase, href }: { f: FinalistDto; baseName: string; isBase: boolean; href: string }) {
  const o = f.offer;
  const where = locationLine(f);
  return (
    <Card className="flex h-full flex-col gap-3" data-testid="finalist" data-hotel-id={f.hotel.id}>
      <div className="space-y-1">
        {isBase ? (
          <Badge tone="neutral">{t.base}</Badge>
        ) : (
          <p data-testid="surcharge" data-delta-eur={f.price_delta_eur}>
            {Math.round(f.price_delta_eur) === 0 ? (
              <span className="text-sm font-semibold text-zinc-700">{t.samePrice(baseName)}</span>
            ) : (
              <>
                <span className="text-lg font-bold text-zinc-950 tabular-nums">{t.surcharge(formatEuro(f.price_delta_eur))}</span>{' '}
                <span className="text-sm text-zinc-500">{t.surchargeAgainst(baseName)}</span>
              </>
            )}
          </p>
        )}
        <Link to={href} className="block text-lg font-semibold text-zinc-950 hover:underline" data-testid="finalist-name">
          {f.hotel.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <QualityBadge score={f.quality.score} reviews={f.hotel.review_count} />
          {f.hotel.stars ? <span className="text-sm text-amber-600">{'★'.repeat(Math.round(f.hotel.stars))}</span> : null}
        </div>
      </div>
      <PraiseLabels labels={f.labels} />
      <div className="space-y-0.5 text-sm text-zinc-600">
        <p>
          {o.place_name} · {formatStay(o.checkin, o.checkout)}
        </p>
        {where ? <p data-testid="finalist-location">{where}</p> : null}
        <p>
          {o.room_name} · {de.results.boardNames[o.board_type]} · {cancellationText(o.refundable, o.free_cancel_until)}
        </p>
      </div>
      {f.warnings.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {f.warnings.map((w) => (
            <Badge key={w.topic} tone={w.verified ? 'warning' : 'neutral'}>
              {w.label}: {de.reviewCheck.mentionsShort(w.count, w.recent_count, constants.REVIEW_RECENT_MONTHS_LABEL)}
            </Badge>
          ))}
        </div>
      ) : null}
      {f.review_status === 'none' ? <p className="text-xs text-zinc-500">{t.notChecked}</p> : null}
      {!isBase ? <Comparison f={f} /> : null}
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <span className="block text-xs uppercase tracking-wide text-zinc-500">{de.results.total}</span>
          <span className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="finalist-total" data-total-eur={o.total_price_eur}>
            {formatEuro(o.total_price_eur)}
          </span>
        </div>
        <Link to={href} className="text-sm font-semibold text-brand-700 hover:underline">
          {t.details}
        </Link>
      </div>
    </Card>
  );
}

export function FinaleView({
  searchId,
  token,
  filters,
  detailHref,
}: {
  searchId: string;
  token: string;
  /** The applied filters of the list (memoised by the caller). */
  filters: ResultsParams;
  detailHref: (hotelId: string) => string;
}) {
  // null: the goal chosen in the search form.
  const [goal, setGoal] = useState<Goal | null>(null);
  const [data, setData] = useState<FinaleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchFinale(searchId, token, goal ? { ...filters, goal } : filters, controller.signal)
      .then((r) => {
        setData(r);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [searchId, token, filters, goal]);

  const base = data?.finalists[0];
  return (
    <section className="space-y-4" data-testid="finale" data-goal={data?.goal} aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl space-y-1">
          <Heading level={2}>{t.title}</Heading>
          <Text className="text-sm">{t.lead}</Text>
        </div>
        <GoalSwitch value={goal ?? data?.goal ?? DEFAULT_GOAL} onChange={setGoal} />
      </div>
      {error ? <Alert tone="error">{de.status.apiUnreachable}</Alert> : null}
      {!data && loading ? <Spinner label={de.common.loading} /> : null}
      {data ? (
        <>
          <Excluded excluded={data.excluded} />
          {data.finalists.length === 0 ? (
            <Alert tone="info">{t.empty}</Alert>
          ) : (
            <>
              <ol className={cx('grid gap-3', GRID[data.finalists.length])} data-testid="finalists">
                {data.finalists.map((f) => (
                  <li key={f.hotel.id}>
                    <FinalistCard f={f} isBase={f === base} baseName={base?.hotel.name ?? ''} href={detailHref(f.hotel.id)} />
                  </li>
                ))}
              </ol>
              <p className="text-xs text-zinc-500" data-testid="finale-note">
                {t.decide}
                {data.runners_up > 0 ? ` ${t.runnersUp(data.runners_up)}` : ''}
              </p>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
