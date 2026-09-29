// Finale (F15, F16, S11.7): the goal switch, what the program sorted out and
// why, and the finalists as a price ladder, the cheapest first. Every row
// shows price, surcharge and short badges (green: has it additionally, struck
// through: lacks it, plain: same as the cheapest), no sentences. The
// recommendation (lowest comparison price, domain/comparison.ts) is marked
// "Unsere Wahl"; the order stays by price. The goal switch is owned by the
// results page, so the matrix and the list follow it too.
import { useEffect, useState, type ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/16/solid';
import { Link } from 'react-router';
import { exclusionReasonSchema, type AttractivenessDto, type ExclusionReasonCode, type FinaleResponse, type FinalistDto, type OfferFeatureDto } from '@reiseplaner/contracts';
import { constants, DEFAULT_GOAL, type Goal } from '@reiseplaner/domain';
import { Alert, Badge, Heading, Spinner, Text, cx } from '@reiseplaner/ui';
import { GoalSwitch } from '../../components/GoalSwitch';
import { de } from '../../i18n/de';
import { formatEuro, formatStay } from '../../lib/format';
import { RatingPair } from './RatingPair';
import { fetchFinale, type ResultsParams } from './api';
import { FeatureIcon } from './FeatureIcon';

const t = de.finale;

type BadgeKind = 'plus' | 'minus' | 'same';

const BADGE_CLASS: Record<BadgeKind, string> = {
  plus: 'bg-brand-50 text-brand-800 ring-brand-200 font-semibold',
  minus: 'bg-white text-zinc-400 ring-zinc-200 line-through',
  same: 'bg-white text-zinc-700 ring-zinc-200',
};
/** From guest reviews (Aufgabe 10): yellow praise, grey criticism. */
const PRAISE_CLASS = 'bg-amber-50 text-amber-800 ring-amber-200';
const CRITIQUE_CLASS = 'bg-zinc-200 text-zinc-800 ring-zinc-300';

function badgeText(f: OfferFeatureDto): string {
  const walk = f.code.startsWith('lage_') && f.minutes !== undefined ? t.walk[f.code.slice('lage_'.length)] : undefined;
  if (walk && f.minutes !== undefined) return walk(f.minutes);
  return t.badge[f.code] ?? f.label;
}

function FeatureBadge({ f, kind }: { f: OfferFeatureDto; kind: BadgeKind }) {
  const praise = f.code.startsWith('lob_');
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none ring-1 ring-inset whitespace-nowrap',
        praise && kind !== 'minus' ? PRAISE_CLASS : BADGE_CLASS[kind],
      )}
      title={f.minutes !== undefined ? t.walkTitle(f.label) : f.label}
      data-testid="feature-badge"
      data-kind={kind}
      data-code={f.code}
    >
      <FeatureIcon code={f.code} />
      {badgeText(f)}
    </span>
  );
}

/**
 * What a house brings, compared with the cheapest: extras (green, most
 * decisive first), what it lacks (struck through, at least
 * FINALE_LOSSES_SHOWN always visible), then what both have, together at most
 * FINALE_BADGES_SHOWN; the rest on request. The cheapest shows its own features.
 */
function Badges({ f, isBase }: { f: FinalistDto; isBase: boolean }) {
  const [all, setAll] = useState(false);
  const max = constants.FINALE_BADGES_SHOWN;
  const gainCodes = new Set(f.gains.map((g) => g.code));
  const same = (isBase ? f.features : f.features.filter((x) => !gainCodes.has(x.code))).map((x) => ({ f: x, kind: 'same' as const }));
  const plus = isBase ? [] : f.gains.map((x) => ({ f: x, kind: 'plus' as const }));
  const minus = isBase ? [] : f.losses.map((x) => ({ f: x, kind: 'minus' as const }));
  const lossSlots = Math.min(minus.length, Math.max(constants.FINALE_LOSSES_SHOWN, max - plus.length));
  const gainSlots = Math.min(plus.length, max - lossSlots);
  const first = [...plus.slice(0, gainSlots), ...minus.slice(0, lossSlots)];
  const rest = [...plus.slice(gainSlots), ...minus.slice(lossSlots)];
  const fill = Math.max(0, max - first.length);
  const list = all ? [...plus, ...minus, ...same] : [...first, ...same.slice(0, fill)];
  const hidden = all ? 0 : rest.length + Math.max(0, same.length - fill);
  const shown = list;
  if (list.length === 0 && f.warnings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="badges">
      {shown.map((b) => (
        <FeatureBadge key={`${b.kind}-${b.f.code}`} f={b.f} kind={b.kind} />
      ))}
      {f.warnings.map((w) => (
        <span
          key={w.topic}
          className={cx('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none whitespace-nowrap ring-1 ring-inset', CRITIQUE_CLASS)}
          title={`${t.critiqueTitle}: ${de.reviewCheck.mentionsShort(w.count, w.recent_count, constants.REVIEW_RECENT_MONTHS_LABEL)}`}
          data-testid="warning-badge"
          data-verified={w.verified}
        >
          <ExclamationTriangleIcon aria-hidden="true" className="size-3" />
          {w.label}
        </span>
      ))}
      {hidden > 0 ? (
        <button type="button" className="rounded-full px-2 py-1 text-xs font-medium text-brand-700 hover:underline" onClick={() => setAll(true)} data-testid="more-features">
          {t.moreBadges(hidden)}
        </button>
      ) : null}
    </div>
  );
}

function Row({ f, isBase, href, littleToOffer }: { f: FinalistDto; isBase: boolean; href: string; littleToOffer: boolean }) {
  const o = f.offer;
  const same = Math.round(f.price_delta_eur) === 0;
  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-3 px-3 py-3 sm:grid-cols-[7rem_1fr] sm:px-4" data-testid="finalist" data-hotel-id={f.hotel.id}>
      <div>
        <span className="block text-lg font-bold text-zinc-950 tabular-nums" data-testid="finalist-total" data-total-eur={o.total_price_eur}>
          {formatEuro(o.total_price_eur)}
        </span>
        {isBase ? (
          <span className="text-xs text-zinc-500">{t.cheapest}</span>
        ) : (
          <span className="text-xs font-semibold text-brand-700 tabular-nums" data-testid="surcharge" data-delta-eur={f.price_delta_eur}>
            {same ? t.samePriceShort : t.surcharge(formatEuro(f.price_delta_eur))}
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Link to={href} className="font-semibold text-zinc-950 hover:underline" data-testid="finalist-name">
              {f.hotel.name}
            </Link>
            {f.recommended ? (
              <Badge tone="brand" data-testid="recommended">
                {t.recommended}
              </Badge>
            ) : null}
          </span>
          {f.quality.score === null ? (
            <Badge tone="warning" data-testid="unrated">
              {t.unrated}
            </Badge>
          ) : (
            <RatingPair quality={f.quality} rating={f.hotel.rating} reviews={f.hotel.review_count} sources={f.hotel.rating_sources} size="sm" />
          )}
        </div>
        {littleToOffer ? (
          <p className="text-xs font-medium text-orange-800" data-testid="finalist-little-to-offer">
            {de.attractiveness.listNote(o.place_name)}
          </p>
        ) : null}
        <p className="text-xs text-zinc-500">
          {o.place_name} · {formatStay(o.checkin, o.checkout)}
          {f.hotel.stars ? <span className="ml-1 text-amber-600">{'★'.repeat(Math.round(f.hotel.stars))}</span> : null}
        </p>
        <Badges f={f} isBase={isBase} />
      </div>
    </li>
  );
}

function LegendItem({ className, children, text }: { className: string; children: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cx('inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 ring-1 ring-inset', className)}>{children}</span>
      <span>{text}</span>
    </li>
  );
}

/** What the colours mean (Aufgabe 10): comparison with the cheapest, and what guests say. */
function Legend({ osm }: { osm: boolean }) {
  const l = t.legend;
  return (
    <div className="max-w-3xl space-y-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 ring-1 ring-zinc-200" data-testid="finale-legend">
      <p className="font-semibold text-zinc-800">{l.title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-medium text-zinc-700">{l.compareTitle}</p>
          <ul className="space-y-1">
            <LegendItem className={BADGE_CLASS.plus} text={l.plus}>
              {l.plusChip}
            </LegendItem>
            <LegendItem className={BADGE_CLASS.same} text={l.same}>
              {l.sameChip}
            </LegendItem>
            <LegendItem className={BADGE_CLASS.minus} text={l.minus}>
              {l.minusChip}
            </LegendItem>
            <LegendItem className="bg-brand-600 font-medium text-white ring-brand-600" text={l.recommended}>
              {t.recommended}
            </LegendItem>
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-zinc-700">{l.reviewsTitle}</p>
          <ul className="space-y-1">
            <LegendItem className={PRAISE_CLASS} text={l.praise}>
              {l.praiseChip}
            </LegendItem>
            <LegendItem className={CRITIQUE_CLASS} text={l.critique}>
              {l.critiqueChip}
            </LegendItem>
          </ul>
          <p className="mt-1.5" data-testid="legend-reviews-note">
            {l.reviewsNote}
          </p>
        </div>
      </div>
      {osm ? <p data-testid="osm-attribution">{t.osm}</p> : null}
    </div>
  );
}

function reasonText(reason: ExclusionReasonCode, n: number, goal: Goal): string {
  if (reason === 'star_trap') return t.excluded.star_trap(n, constants.STAR_TRAP_MIN_STARS);
  // "Komfort" has no price exception for weaker houses.
  if (reason === 'low_quality' && goal === 'komfort') return t.excluded.low_quality_komfort(n);
  return t.excluded[reason](n);
}

function Excluded({ excluded, goal, onShowUnrated }: { excluded: FinaleResponse['excluded']; goal: Goal; onShowUnrated: (() => void) | undefined }) {
  const reasons = exclusionReasonSchema.options.filter((r) => excluded[r] > 0);
  const total = reasons.reduce((sum, r) => sum + excluded[r], 0);
  if (total === 0) return <p className="text-sm text-zinc-500">{t.excludedNone}</p>;
  return (
    <details className="text-sm text-zinc-600" data-testid="excluded">
      <summary className="cursor-pointer font-medium text-zinc-800">{t.excludedTitle(total)}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {reasons.map((r) => (
          <li key={r} data-reason={r}>
            {reasonText(r, excluded[r], goal)}
            {r === 'no_reviews' && onShowUnrated ? (
              <>
                {' · '}
                <button type="button" className="font-medium text-brand-700 hover:underline" onClick={onShowUnrated} data-testid="show-unrated">
                  {t.showUnrated} ↓
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function FinaleView({
  searchId,
  token,
  filters,
  detailHref,
  goal,
  onGoalChange,
  onShowUnrated,
  placeLevels,
}: {
  searchId: string;
  token: string;
  /** The applied filters of the list (memoised by the caller). */
  filters: ResultsParams;
  detailHref: (hotelId: string) => string;
  /** null: the goal chosen in the search form. */
  goal: Goal | null;
  onGoalChange: (goal: Goal) => void;
  /** Scrolls to the sorted-out houses without reviews below all offers, when there are any. */
  onShowUnrated?: (() => void) | undefined;
  /** What the places of the search offer (Aufgabe 8), by place id. */
  placeLevels?: ReadonlyMap<string, AttractivenessDto>;
}) {
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
        <GoalSwitch value={goal ?? data?.goal ?? DEFAULT_GOAL} onChange={onGoalChange} />
      </div>
      {error ? <Alert tone="error">{de.status.apiUnreachable}</Alert> : null}
      {!data && loading ? <Spinner label={de.common.loading} /> : null}
      {data ? (
        <>
          <Excluded excluded={data.excluded} goal={data.goal} onShowUnrated={onShowUnrated} />
          {data.finalists.length === 0 ? (
            <Alert tone="info">{t.empty}</Alert>
          ) : (
            <>
              <ol className="max-w-3xl divide-y divide-zinc-200 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200" data-testid="finalists">
                {data.finalists.map((f) => (
                  <Row key={f.hotel.id} f={f} isBase={f === base} href={detailHref(f.hotel.id)} littleToOffer={placeLevels?.get(f.offer.place_id)?.level === 'wenig'} />
                ))}
              </ol>
              <Legend osm={data.finalists.some((f) => f.features.some((x) => x.minutes !== undefined))} />
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
