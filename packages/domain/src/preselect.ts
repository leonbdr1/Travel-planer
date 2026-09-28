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
  RED_FLAG_MIN_MENTIONS,
  STAR_TRAP_MIN_QUALITY,
  STAR_TRAP_MIN_REFERENCE,
  STAR_TRAP_MIN_STARS,
  STAR_TRAP_PRICE_RATIO,
  STAR_TRAP_WARNING_TOPICS,
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
}

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
function failedRule(e: Entry, goal: Goal, stage: Stage, budgetMedian: number | null): ExclusionReason | null {
  const q = e.offer.quality;
  if (q === null) return 'no_reviews';
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
    entries.push({ offer, stars: hotel?.stars ?? null, evidence, features: new Set(features.map((f) => f.code)) });
  }
  // Budget price reference for the star trap: houses with fewer stars (or none).
  const budgetMedian = median(
    entries.filter((e) => (e.stars ?? 0) < STAR_TRAP_MIN_STARS && e.offer.quality !== null).map((e) => e.offer.pricePerNightCents),
    STAR_TRAP_MIN_REFERENCE,
  );
  const remaining: Entry[] = [];
  for (const e of entries) {
    const reason = failedRule(e, input.goal, stage, budgetMedian);
    if (reason) excluded[reason] += 1;
    else remaining.push(e);
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
    const checked = remaining.filter((e) => e.evidence.checked);
    const limit = Math.min(...(checked.length > 0 ? checked : remaining).map((e) => e.offer.totalCents)) * (1 + window);
    const within = remaining.filter((e) => e.offer.totalCents <= limit);
    excluded.too_expensive += remaining.length - within.length;
    remaining = within;
  }
  const undominated = remaining.filter((a) => !remaining.some((b) => b !== a && dominates(b, a)));
  excluded.dominated += remaining.length - undominated.length;

  // Checked houses first; unchecked ones only fill up the finale.
  const byGoal = (a: Entry, b: Entry) => goalOrder(input.goal)(a.offer, b.offer);
  const ordered = [...undominated.filter((e) => e.evidence.checked).sort(byGoal), ...undominated.filter((e) => !e.evidence.checked).sort(byGoal)].map(
    (e) => e.offer,
  );
  const finalists = ordered.slice(0, FINALISTS_MAX).sort((a, b) => a.totalCents - b.totalCents || b.rankScore - a.rankScore);
  return { goal: input.goal, finalists, runnersUp: ordered.slice(FINALISTS_MAX), excluded };
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
    .remaining.map((e) => e.offer)
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
  return [...new Set(goals.flatMap((goal) => preselect({ ...input, goal }).finalists.map((o) => o.hotelId)))];
}
