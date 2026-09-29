// Goal and automatic pre-selection (konzept.md 9.9, architektur.md 6.15):
// the program sorts out what does not fit the traveller's goal and leaves at
// most FINALISTS_MAX houses between which the choice is really open. Every
// removal is counted with its reason. Stars never raise the quality: a
// 4-star house at a budget price needs checked good reviews ("star trap").
import {
  CANDIDATE_QUALITY_MARGIN,
  DOMINANCE_QUALITY_TOLERANCE,
  FINALISTS_MAX,
  GOAL_PRICE_WINDOW,
  GOAL_QUALITY_FLOOR,
  LOW_QUALITY_EXCEPTION_MIN,
  LOW_QUALITY_EXCEPTION_PRICE_RATIO,
  RED_FLAG_THRESHOLDS,
  STAR_TRAP_MIN_QUALITY,
  STAR_TRAP_MIN_REFERENCE,
  STAR_TRAP_MIN_STARS,
  STAR_TRAP_PRICE_RATIO,
  STAR_TRAP_WARNING_TOPICS,
  UNRATED_FINALISTS_MAX,
  UNRATED_MAX_EXTRAS_SHARE,
  UNRATED_MIN_PRICE_RATIO,
} from './constants';
import { byComparison, premiumExtras, recommendedIndex, type ComparisonInput } from './comparison';
import { offerFeatures, type FeatureHotel } from './features';
import type { EvaluatedOffer } from './ranking';
import { GOALS, type Goal, type PraiseTopic } from './vocabulary';

export interface PreselectHotel extends FeatureHotel {
  id: string;
  stars: number | null;
}

/** A complaint topic the review check found (review-keywords.ts TopicResult). */
export interface WarningEvidence {
  topic: string;
  confirmed: number;
  unverified: number;
  /** Complaining guests among all checked reviews (estimated beyond what the AI saw). */
  guests: number;
  /** Their share of the checked reviews, weighted by age, 0–1. */
  share: number;
}

/** What the review check found for a house; houses without a check have none. */
export interface HotelEvidence {
  checked: boolean;
  warnings: readonly WarningEvidence[];
  labels: readonly PraiseTopic[];
}

export const NO_EVIDENCE: HotelEvidence = { checked: false, warnings: [], labels: [] };

/**
 * Why a house without reviews is sorted out: the goal needs confirmed quality
 * ("komfort"), too few rated houses to compare its price, a price far below
 * the rated houses of its kind, or more extras than most at a lower price.
 */
export type UnratedDoubtCode = 'goal' | 'no_reference' | 'cheap' | 'extras';

export interface UnratedDoubt {
  code: UnratedDoubtCode;
  /** Median price per night of the rated houses it was compared with; null without a comparison. */
  referencePerNightCents: number | null;
}

/** In rule order: a house counts for the first rule it fails. */
export const EXCLUSION_REASONS = ['filters', 'no_reviews', 'red_flag', 'star_trap', 'low_quality', 'too_expensive', 'dominated'] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

export interface Preselection {
  goal: Goal;
  /** At most FINALISTS_MAX offers, one per house, cheapest first. */
  finalists: EvaluatedOffer[];
  /** The finalist with the lowest comparison price (comparison.ts); null without a rated finalist. */
  recommendedHotelId: string | null;
  /** Houses that fit but did not make it into the finale, in goal order. */
  runnersUp: EvaluatedOffer[];
  /** Houses per reason. */
  excluded: Record<ExclusionReason, number>;
}

export interface PreselectInput {
  goal: Goal;
  evaluated: readonly EvaluatedOffer[];
  hotels: ReadonlyMap<string, PreselectHotel>;
  evidence: ReadonlyMap<string, HotelEvidence>;
}

interface Entry {
  offer: EvaluatedOffer;
  stars: number | null;
  evidence: HotelEvidence;
  features: ReadonlySet<string>;
  /** Below the goal's quality floor, in through LOW_QUALITY_EXCEPTION_*. */
  exception: boolean;
}

/** Extras a fake listing likes to promise; counted for houses without reviews. */
const premiumCount = (e: Entry) => premiumExtras(e.features);
const isRated = (e: Entry) => e.offer.quality !== null;

export function comparisonOf(offer: EvaluatedOffer, featureCodes: Iterable<string>): ComparisonInput {
  return { totalCents: offer.totalCents, quality: offer.quality, reviews: offer.breakdown.effectiveReviews, extras: premiumExtras(featureCodes) };
}
const comparisonEntry = (e: Entry) => comparisonOf(e.offer, e.features);

type Stage = 'final' | 'candidates';

function median(values: readonly number[], minCount: number): number | null {
  if (values.length < minCount) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** A house enters with its cheapest passing offer; on a tie the freely cancellable one. */
function houseOffer(offers: readonly EvaluatedOffer[]): EvaluatedOffer | null {
  let best: EvaluatedOffer | null = null;
  for (const o of offers) {
    if (!o.passes) continue;
    if (!best || o.totalCents < best.totalCents || (o.totalCents === best.totalCents && o.refundable && !best.refundable)) best = o;
  }
  return best;
}

type RedFlagThreshold = { guests: number; guestsUnverified: number; share: number };

/**
 * Mould, vermin or dirt out of hand (RED_FLAG_THRESHOLDS, Ben 2026-09-29):
 * enough guests and a large enough share of the checked reviews. A few
 * complaints among many guests stay a warning; the house is ranked normally.
 */
export function hasRedFlag(e: HotelEvidence): boolean {
  return e.warnings.some((w) => {
    const t = (RED_FLAG_THRESHOLDS as Record<string, RedFlagThreshold | undefined>)[w.topic];
    if (!t || (w.confirmed === 0 && w.unverified === 0)) return false;
    return w.guests >= (w.confirmed > 0 ? t.guests : t.guestsUnverified) && w.share >= t.share;
  });
}

/** Any warning the traveller would see on these topics. */
function hasAnyWarning(e: HotelEvidence, topics: readonly string[]): boolean {
  return e.warnings.some((w) => topics.includes(w.topic) && (w.confirmed > 0 || w.unverified > 0));
}

/** Every goal by comparison price: the cheapest, unless a little more buys proven advantages. */
function goalOrder(goal: Goal) {
  const cmp = byComparison(goal);
  return (a: Entry, b: Entry): number => cmp(comparisonEntry(a), comparisonEntry(b));
}

/**
 * `b` is not more expensive, at least as good, brings everything `a` brings,
 * and is better in one of these. A house without review check never pushes
 * out a checked one: it might turn out dirty.
 */
function dominates(b: Entry, a: Entry): boolean {
  if (a.evidence.checked && !b.evidence.checked) return false;
  if (b.offer.totalCents > a.offer.totalCents) return false;
  const qa = a.offer.quality ?? 0;
  const qb = b.offer.quality ?? 0;
  if (qb < qa - DOMINANCE_QUALITY_TOLERANCE) return false;
  for (const f of a.features) if (!b.features.has(f)) return false;
  return b.offer.totalCents < a.offer.totalCents || qb > qa + DOMINANCE_QUALITY_TOLERANCE || b.features.size > a.features.size;
}

/**
 * Before the review check (`candidates`) red flags cannot be known yet, and
 * houses somewhat below a quality threshold stay in: the check can clear a
 * star-trap suspect or lift a score with good recent reviews.
 */
function failedRule(e: Entry, goal: Goal, stage: Stage, budgetMedian: number | null, doubt: UnratedDoubt | null): ExclusionReason | null {
  const q = e.offer.quality;
  if (q === null) return doubt ? 'no_reviews' : null;
  if (stage === 'final' && hasRedFlag(e.evidence)) return 'red_flag';
  const margin = stage === 'final' ? 0 : CANDIDATE_QUALITY_MARGIN;
  const suspect = (e.stars ?? 0) >= STAR_TRAP_MIN_STARS && budgetMedian !== null && e.offer.pricePerNightCents < STAR_TRAP_PRICE_RATIO * budgetMedian;
  if (suspect) {
    const cleared = e.evidence.checked && q >= STAR_TRAP_MIN_QUALITY && !hasAnyWarning(e.evidence, STAR_TRAP_WARNING_TOPICS);
    if (stage === 'final' ? !cleared : q < STAR_TRAP_MIN_QUALITY - margin) return 'star_trap';
  }
  if (q < GOAL_QUALITY_FLOOR[goal] - margin) return 'low_quality';
  return null;
}

function exceptionEligible(e: Entry, goal: Goal, stage: Stage): boolean {
  const q = e.offer.quality;
  if (goal === 'komfort' || q === null) return false;
  return stage === 'final' ? e.evidence.checked && q >= LOW_QUALITY_EXCEPTION_MIN : q >= LOW_QUALITY_EXCEPTION_MIN - CANDIDATE_QUALITY_MARGIN;
}

/**
 * Houses without reviews fit (no doubt) when their price and extras look like
 * the rated houses around them: not far below the usual price for their
 * stars, and not cheaper while promising more extras than most. Never for
 * "komfort", whose promise is quality nobody has confirmed yet.
 */
function unratedCheck(entries: readonly Entry[], goal: Goal): (e: Entry) => UnratedDoubt | null {
  const rated = entries.filter(isRated);
  const extras = rated.map(premiumCount);
  const prices = (list: readonly Entry[]) => list.map((e) => e.offer.pricePerNightCents);
  return (e) => {
    if (goal === 'komfort') return { code: 'goal', referencePerNightCents: null };
    const reference =
      median(prices(rated.filter((r) => (r.stars ?? 0) === (e.stars ?? 0))), STAR_TRAP_MIN_REFERENCE) ?? median(prices(rated), STAR_TRAP_MIN_REFERENCE);
    if (reference === null) return { code: 'no_reference', referencePerNightCents: null };
    const price = e.offer.pricePerNightCents;
    if (price < UNRATED_MIN_PRICE_RATIO * reference) return { code: 'cheap', referencePerNightCents: reference };
    const own = premiumCount(e);
    const reaching = extras.filter((c) => c >= own).length / extras.length;
    return price < reference && own > 0 && reaching < UNRATED_MAX_EXTRAS_SHARE ? { code: 'extras', referencePerNightCents: reference } : null;
  };
}

interface RuleOutcome {
  remaining: Entry[];
  excluded: Record<ExclusionReason, number>;
  /** Houses without reviews counted under `no_reviews`, with the doubt. */
  unrated: Map<string, UnratedDoubt>;
}

function applyRules(input: PreselectInput, stage: Stage): RuleOutcome {
  const excluded = Object.fromEntries(EXCLUSION_REASONS.map((r) => [r, 0])) as Record<ExclusionReason, number>;
  const byHotel = new Map<string, EvaluatedOffer[]>();
  for (const o of input.evaluated) {
    const list = byHotel.get(o.hotelId);
    if (list) list.push(o);
    else byHotel.set(o.hotelId, [o]);
  }
  const entries: Entry[] = [];
  for (const [hotelId, offers] of byHotel) {
    const offer = houseOffer(offers);
    if (!offer) {
      excluded.filters += 1;
      continue;
    }
    const hotel = input.hotels.get(hotelId);
    const evidence = input.evidence.get(hotelId) ?? NO_EVIDENCE;
    const reviews = { reviewCount: offer.breakdown.reviewCount, effectiveReviews: offer.breakdown.effectiveReviews };
    const features = offerFeatures({ ...(hotel ?? { facilityIds: [], hotelType: null }), ...reviews }, offer, evidence.labels);
    entries.push({ offer, stars: hotel?.stars ?? null, evidence, features: new Set(features.map((f) => f.code)), exception: false });
  }
  // Budget price reference for the star trap: houses with fewer stars (or none).
  const budgetMedian = median(
    entries.filter((e) => (e.stars ?? 0) < STAR_TRAP_MIN_STARS && e.offer.quality !== null).map((e) => e.offer.pricePerNightCents),
    STAR_TRAP_MIN_REFERENCE,
  );
  const remaining: Entry[] = [];
  const belowFloor: Entry[] = [];
  const unrated = new Map<string, UnratedDoubt>();
  const doubtOf = unratedCheck(entries, input.goal);
  for (const e of entries) {
    const doubt = isRated(e) ? null : doubtOf(e);
    const reason = failedRule(e, input.goal, stage, budgetMedian, doubt);
    if (reason === 'no_reviews' && doubt) unrated.set(e.offer.hotelId, doubt);
    if (reason === 'low_quality' && exceptionEligible(e, input.goal, stage)) belowFloor.push(e);
    else if (reason) excluded[reason] += 1;
    else remaining.push(e);
  }
  // A weaker house stays in when it is clearly cheaper than every house
  // meeting the floor (or when no house meets it).
  const normal = remaining.filter(isRated).map((e) => e.offer.totalCents);
  const cheapestNormal = normal.length > 0 ? Math.min(...normal) : null;
  for (const e of belowFloor) {
    if (cheapestNormal === null || e.offer.totalCents <= LOW_QUALITY_EXCEPTION_PRICE_RATIO * cheapestNormal) remaining.push({ ...e, exception: true });
    else excluded.low_quality += 1;
  }
  return { remaining, excluded, unrated };
}

export function preselect(input: PreselectInput): Preselection {
  const { remaining: afterRules, excluded } = applyRules(input, 'final');
  let remaining = afterRules;
  const window = GOAL_PRICE_WINDOW[input.goal];
  if (window !== null && remaining.length > 0) {
    // Measured from the cheapest clean house: the cheapest one with a review
    // check that passed every rule; without any check, the cheapest one.
    // Houses in by the quality exception do not set the window.
    const normal = remaining.filter((e) => isRated(e) && !e.exception);
    const checked = normal.filter((e) => e.evidence.checked);
    const base = checked.length > 0 ? checked : normal.length > 0 ? normal : remaining;
    const limit = Math.min(...base.map((e) => e.offer.totalCents)) * (1 + window);
    const within = remaining.filter((e) => e.offer.totalCents <= limit);
    excluded.too_expensive += remaining.length - within.length;
    remaining = within;
  }
  const undominated = remaining.filter((a) => !remaining.some((b) => b !== a && dominates(b, a)));
  excluded.dominated += remaining.length - undominated.length;

  // Checked houses first; unchecked ones only fill up the finale.
  const byGoal = goalOrder(input.goal);
  const ordered = [...undominated.filter((e) => e.evidence.checked).sort(byGoal), ...undominated.filter((e) => !e.evidence.checked).sort(byGoal)];
  // At most UNRATED_FINALISTS_MAX houses without reviews in the finale.
  const picked: Entry[] = [];
  const runnersUp: EvaluatedOffer[] = [];
  let unrated = 0;
  for (const e of ordered) {
    const fits = picked.length < FINALISTS_MAX && (isRated(e) || unrated < UNRATED_FINALISTS_MAX);
    if (!fits) {
      runnersUp.push(e.offer);
      continue;
    }
    if (!isRated(e)) unrated += 1;
    picked.push(e);
  }
  picked.sort((a, b) => a.offer.totalCents - b.offer.totalCents || byGoal(a, b));
  const recommended = recommendedIndex(picked.map(comparisonEntry), input.goal);
  const recommendedHotelId = recommended === null ? null : (picked[recommended]?.offer.hotelId ?? null);
  return { goal: input.goal, finalists: picked.map((e) => e.offer), recommendedHotelId, runnersUp, excluded };
}

/**
 * Houses that pass the goal's rules (filters, reviews or a plausible price,
 * no red flag, no star trap, quality floor or its exception). Lists and the
 * matrix show only these, so a bad house never shows up with a cheap price.
 */
export function admissibleHotelIds(input: PreselectInput): Set<string> {
  return new Set(applyRules(input, 'final').remaining.map((e) => e.offer.hotelId));
}

/**
 * Houses without reviews the goal's rules sort out, with the doubt (Ben,
 * 2026-09-29): no reviews does not mean bad, so the list shows them apart and
 * the traveller decides. The finale and the recommendation stay without them.
 */
export function unratedDoubts(input: PreselectInput): Map<string, UnratedDoubt> {
  return applyRules(input, 'final').unrated;
}

/**
 * Houses to run the review check for. First the likely finalists of every
 * goal, the traveller's goal first (red flags are unknown before the check),
 * so switching the goal in the finale still finds checked houses. Then, as
 * reserve for finalists the check takes out, the traveller's goal order under
 * the rules without red flags, price window and dominance: the cheapest clean
 * alternatives are checked even when the very cheapest turns out dirty.
 */
export function reviewCandidateIds(input: PreselectInput, limit: number): string[] {
  const reserve = applyRules(input, 'candidates')
    .remaining.filter(isRated)
    .sort(goalOrder(input.goal))
    .map((e) => e.offer.hotelId);
  return [...new Set([...finalistIdsAcrossGoals(input), ...reserve])].slice(0, limit);
}

/**
 * The finalists of every goal, the traveller's goal first, each house once.
 * After the first review round the scores move (recent reviews, warnings), so
 * houses can move into a finale unchecked; the follow-up round checks them.
 */
export function finalistIdsAcrossGoals(input: PreselectInput): string[] {
  const goals = [input.goal, ...GOALS.filter((g) => g !== input.goal)];
  // Houses without reviews have nothing to check.
  return [...new Set(goals.flatMap((goal) => preselect({ ...input, goal }).finalists.filter((o) => o.quality !== null).map((o) => o.hotelId)))];
}
