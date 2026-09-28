// Praise labels (konzept.md 9.11, architektur.md 6.15): per topic, how many
// guests praise it (a topic word in the review's "positive" field) and how
// many criticise it (in the "negative" field), over the last
// PRAISE_MAX_AGE_MONTHS. One count per review and field. A label such as
// "Gutes Frühstück" appears relative to the house's review volume (see
// constants: praising guests, share of all reviews with recent ones weighted
// up, praise share of the mentions) and without a warning on the matching
// complaint topics. Only counts leave this module, never review texts.
import {
  PRAISE_MAX_AGE_MONTHS,
  PRAISE_MIN_MENTIONS,
  PRAISE_MIN_REVIEW_SHARE,
  PRAISE_MIN_SHARE,
  PRAISE_RECENT_MONTHS,
  PRAISE_RECENT_WEIGHT,
} from './constants';
import { addMonths } from './dates';
import { PRAISE_LEXICON, type PraiseLexicon } from './generated/praise-lexicon';
import { REVIEW_LEXICON_LANGUAGES, type LexiconLanguage } from './generated/review-lexicon';
import { keywordRegex } from './review-keywords';
import type { GuestReview, IsoDate } from './types';
import { PRAISE_BLOCKED_BY, PRAISE_TOPICS, isPraiseTopic, type PraiseTopic } from './vocabulary';

export { PRAISE_LEXICON, type PraiseLexicon };

export interface PraiseCount {
  topic: PraiseTopic;
  /** Reviews whose positive field names the topic. */
  praised: number;
  /** Reviews whose negative field names the topic. */
  criticized: number;
  /** The same with recent reviews weighted up (PRAISE_RECENT_WEIGHT). */
  praisedWeighted: number;
  criticizedWeighted: number;
  /** All reviews of the period, weighted the same way: the base of the review share. */
  reviewsWeighted: number;
}

/** Counts as stored; rows written before the weighting fall back to the plain counts. */
export interface StoredPraiseCount {
  topic: string;
  praised: number;
  criticized: number;
  praisedWeighted?: number | undefined;
  criticizedWeighted?: number | undefined;
  reviewsWeighted?: number | undefined;
}

interface CompiledPraiseLexicon {
  topics: Record<PraiseTopic, Record<LexiconLanguage, RegExp[]>>;
  nothing: Record<LexiconLanguage, ReadonlySet<string>>;
}

const perLanguage = <T>(fn: (lang: LexiconLanguage) => T) => Object.fromEntries(REVIEW_LEXICON_LANGUAGES.map((l) => [l, fn(l)])) as Record<LexiconLanguage, T>;

export function compilePraiseLexicon(lexicon: PraiseLexicon = PRAISE_LEXICON): CompiledPraiseLexicon {
  return {
    topics: Object.fromEntries(PRAISE_TOPICS.map((t) => [t, perLanguage((l) => lexicon.topics[t][l].map(keywordRegex))])) as CompiledPraiseLexicon['topics'],
    nothing: perLanguage((l) => new Set(lexicon.nothing[l].map((w) => w.toLocaleLowerCase('de')))),
  };
}

const DEFAULT_COMPILED = compilePraiseLexicon();

/** The review's own language; unknown languages use all lists. */
function languagesOf(language: string | null): readonly LexiconLanguage[] {
  const lang = language?.slice(0, 2).toLowerCase() ?? '';
  return (REVIEW_LEXICON_LANGUAGES as readonly string[]).includes(lang) ? [lang as LexiconLanguage] : REVIEW_LEXICON_LANGUAGES;
}

const normalize = (s: string) => s.replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();

/** "Nichts zu bemängeln. Das WLAN war langsam." → only the second sentence counts. */
function withoutNothingOpening(cons: string, langs: readonly LexiconLanguage[], compiled: CompiledPraiseLexicon): string {
  const firstWord = cons.toLocaleLowerCase('de').match(/[\p{L}']+/u)?.[0] ?? '';
  if (!langs.some((l) => compiled.nothing[l].has(firstWord))) return cons;
  const end = cons.search(/[.!?;\n]/);
  return end < 0 ? '' : cons.slice(end + 1);
}

function mentions(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/** Praise and criticism per topic relative to `today`; topics nobody mentions are left out. */
export function countPraise(reviews: readonly GuestReview[], today: IsoDate, compiled: CompiledPraiseLexicon = DEFAULT_COMPILED): PraiseCount[] {
  const cutoff = addMonths(today, -PRAISE_MAX_AGE_MONTHS);
  const recent = addMonths(today, -PRAISE_RECENT_MONTHS);
  const counts = new Map<PraiseTopic, PraiseCount>();
  let reviewsWeighted = 0;
  for (const review of reviews) {
    if (review.date === null || review.date < cutoff || review.date > today) continue;
    const weight = review.date >= recent ? PRAISE_RECENT_WEIGHT : 1;
    reviewsWeighted += weight;
    const langs = languagesOf(review.language);
    const pros = review.pros ? normalize(review.pros) : '';
    const cons = review.cons ? withoutNothingOpening(normalize(review.cons), langs, compiled) : '';
    if (!pros && !cons) continue;
    for (const topic of PRAISE_TOPICS) {
      const patterns = langs.flatMap((l) => compiled.topics[topic][l]);
      const praised = pros !== '' && mentions(pros, patterns);
      const criticized = cons !== '' && mentions(cons, patterns);
      if (!praised && !criticized) continue;
      const c = counts.get(topic) ?? { topic, praised: 0, criticized: 0, praisedWeighted: 0, criticizedWeighted: 0, reviewsWeighted: 0 };
      if (praised) {
        c.praised += 1;
        c.praisedWeighted += weight;
      }
      if (criticized) {
        c.criticized += 1;
        c.criticizedWeighted += weight;
      }
      counts.set(topic, c);
    }
  }
  return PRAISE_TOPICS.map((t) => counts.get(t))
    .filter((c): c is PraiseCount => c !== undefined)
    .map((c) => ({ ...c, reviewsWeighted }));
}

/**
 * Labels of a house, the most praised first. `warningTopics` are the
 * complaint topics the traveller sees a warning for; they block the matching
 * labels ("Besonders sauber" never stands next to a mould warning).
 */
export function praiseLabels(counts: readonly StoredPraiseCount[], warningTopics: ReadonlySet<string>): PraiseTopic[] {
  return counts
    .filter((c): c is StoredPraiseCount & { topic: PraiseTopic } => isPraiseTopic(c.topic))
    .map((c) => ({
      topic: c.topic,
      praised: c.praised,
      praisedW: c.praisedWeighted ?? c.praised,
      criticizedW: c.criticizedWeighted ?? c.criticized,
      reviewsW: c.reviewsWeighted ?? 0,
    }))
    .filter(
      (c) =>
        c.praised >= PRAISE_MIN_MENTIONS &&
        c.praisedW >= PRAISE_MIN_REVIEW_SHARE * c.reviewsW &&
        c.praisedW / (c.praisedW + c.criticizedW) >= PRAISE_MIN_SHARE,
    )
    .filter((c) => !PRAISE_BLOCKED_BY[c.topic].some((t) => warningTopics.has(t)))
    .sort((a, b) => b.praisedW - a.praisedW || PRAISE_TOPICS.indexOf(a.topic) - PRAISE_TOPICS.indexOf(b.topic))
    .map((c) => c.topic);
}
