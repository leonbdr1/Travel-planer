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
  RED_FLAG_MIN_MENTIONS,
  STAR_TRAP_MIN_QUALITY,
  STAR_TRAP_MIN_REFERENCE,
  STAR_TRAP_MIN_STARS,
  STAR_TRAP_PRICE_RATIO,
  STAR_TRAP_WARNING_TOPICS,
  UNRATED_FINALISTS_MAX,
  UNRATED_MAX_EXTRAS_SHARE,
  UNRATED_MIN_PRICE_RATIO,
} from './constants';
import { offerFeatures, type FeatureHotel } from './features';
import type { EvaluatedOffer } from './ranking';
import { GOALS, type Goal, type PraiseTopic } from './vocabulary';

export interface PreselectHotel extends FeatureHotel {
  id: string;
  stars: number | null;
}

/** What the review check found for a house; houses without a check have none. */
export interface HotelEvidence {
  checked: boolean;
  warnings: ReadonlyArray<{ topic: string; confirmed: number; unverified: number }>;
  labels: readonly PraiseTopic[];
}

export const NO_EVIDENCE: HotelEvidence = { checked: false, warnings: [], labels: [] };

/** In rule order: a house counts for the first rule it fails. */
export const EXCLUSION_REASONS = ['filters', 'no_reviews', 'red_flag', 'star_trap', 'low_quality', 'too_expensive', 'dominated'] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

export interface Preselection {
  goal: Goal;
  /** At most FINALISTS_MAX offers, one per house, cheapest first. */
  finalists: EvaluatedOffer[];
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
const PREMIUM_FEATURES: readonly string[] = ['fruehstueck_inklusive', 'halbpension', 'sauna_wellness', 'schwimmbad'];
const premiumCount = (e: Entry) => PREMIUM_FEATURES.filter((f) => e.features.has(f)).length;
const isRated = (e: Entry) => e.offer.quality !== null;

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

/** Mould, vermin or dirt, mentioned often enough (RED_FLAG_MIN_MENTIONS). */
export function hasRedFlag(e: HotelEvidence): boolean {
  return e.warnings.some((w) => {
    const min = (RED_FLAG_MIN_MENTIONS as Record<string, { confirmed: number; unverified: number }>)[w.topic];
    return min !== undefined && (w.confirmed >= min.confirmed || w.unverified >= min.unverified);
  });
}

/** Any warning the traveller would see on these topics. */
function hasAnyWarning(e: HotelEvidence, topics: readonly string[]): boolean {
  return e.warnings.some((w) => topics.includes(w.topic) && (w.confirmed > 0 || w.unverified > 0));
}

function goalOrder(goal: Goal) {
  return (a: EvaluatedOffer, b: EvaluatedOffer): number => {
    if (goal === 'sparen') return a.totalCents - b.totalCents || (b.quality ?? 0) - (a.quality ?? 0);
    if (goal === 'komfort') return (b.quality ?? 0) - (a.quality ?? 0) || a.totalCents - b.totalCents;
    return b.rankScore - a.rankScore || a.totalCents - b.totalCents;
  };
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
function failedRule(e: Entry, goal: Goal, stage: Stage, budgetMedian: number | null, unratedFits: (e: Entry) => boolean): ExclusionReason | null {
  const q = e.offer.quality;
  if (q === null) return unratedFits(e) ? null : 'no_reviews';
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
 * Houses without reviews fit when their price and extras look like the rated
 * houses around them: not far below the usual price for their stars, and not
 * cheaper while promising more extras than most. Never for "komfort", whose
 * promise is quality nobody has confirmed yet.
 */
function unratedCheck(entries: readonly Entry[], goal: Goal): (e: Entry) => boolean {
  const rated = entries.filter(isRated);
  const extras = rated.map(premiumCount);
  const prices = (list: readonly Entry[]) => list.map((e) => e.offer.pricePerNightCents);
  return (e) => {
    if (goal === 'komfort') return false;
    const reference =
      median(prices(rated.filter((r) => (r.stars ?? 0) === (e.stars ?? 0))), STAR_TRAP_MIN_REFERENCE) ?? median(prices(rated), STAR_TRAP_MIN_REFERENCE);
    if (reference === null) return false;
    const price = e.offer.pricePerNightCents;
    if (price < UNRATED_MIN_PRICE_RATIO * reference) return false;
    const own = premiumCount(e);
    const reaching = extras.filter((c) => c >= own).length / extras.length;
    return !(price < reference && own > 0 && reaching < UNRATED_MAX_EXTRAS_SHARE);
  };
}

function applyRules(input: PreselectInput, stage: Stage): { remaining: Entry[]; excluded: Record<ExclusionReason, number> } {
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
    const features = offerFeatures(hotel ?? { facilityIds: [], hotelType: null }, offer, evidence.labels);
    entries.push({ offer, stars: hotel?.stars ?? null, evidence, features: new Set(features.map((f) => f.code)), exception: false });
  }
  // Budget price reference for the star trap: houses with fewer stars (or none).
  const budgetMedian = median(
    entries.filter((e) => (e.stars ?? 0) < STAR_TRAP_MIN_STARS && e.offer.quality !== null).map((e) => e.offer.pricePerNightCents),
    STAR_TRAP_MIN_REFERENCE,
  );
  const remaining: Entry[] = [];
  const belowFloor: Entry[] = [];
  const unratedFits = unratedCheck(entries, input.goal);
  for (const e of entries) {
    const reason = failedRule(e, input.goal, stage, budgetMedian, unratedFits);
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
  return { remaining, excluded };
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
  const byGoal = (a: Entry, b: Entry) => goalOrder(input.goal)(a.offer, b.offer);
  const ordered = [...undominated.filter((e) => e.evidence.checked).sort(byGoal), ...undominated.filter((e) => !e.evidence.checked).sort(byGoal)];
  // At most UNRATED_FINALISTS_MAX houses without reviews in the finale.
  const picked: EvaluatedOffer[] = [];
  const runnersUp: EvaluatedOffer[] = [];
  let unrated = 0;
  for (const e of ordered) {
    const fits = picked.length < FINALISTS_MAX && (isRated(e) || unrated < UNRATED_FINALISTS_MAX);
    if (!fits) {
      runnersUp.push(e.offer);
      continue;
    }
    if (!isRated(e)) unrated += 1;
    picked.push(e.offer);
  }
  const finalists = picked.sort((a, b) => a.totalCents - b.totalCents || b.rankScore - a.rankScore);
  return { goal: input.goal, finalists, runnersUp, excluded };
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
    .map((e) => e.offer)
    .sort(goalOrder(input.goal))
    .map((o) => o.hotelId);
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
