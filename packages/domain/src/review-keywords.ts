// Keyword stage of the review check (architektur.md 6.10, steps 3–7): drop
// old reviews, derive recent rating and count, find complaint keywords per
// topic (whole words, case-insensitive, 15 languages since F18), cut snippets of
// ±REVIEW_SNIPPET_RADIUS characters, cap them per topic and in total, and
// aggregate the skill's findings (or, without AI, the unverified hits).
// Author names never reach this module: the provider adapter drops them;
// e-mail addresses and phone numbers are masked before snippets are cut.
import {
  MENTION_RECENT_MONTHS,
  MENTION_RECENT_WEIGHT,
  RECENT_REVIEW_MONTHS,
  REVIEW_FRESH_MONTHS,
  REVIEW_MAX_AGE_MONTHS,
  REVIEW_MAX_SNIPPETS_PER_TOPIC,
  REVIEW_MAX_SNIPPETS_TOTAL,
  REVIEW_RECENT_MONTHS_LABEL,
  REVIEW_SNIPPET_RADIUS,
  SEVERITY_WEIGHTS,
} from './constants';
import { addMonths } from './dates';
import { redactContactData } from './pii';
import { REVIEW_LEXICON, REVIEW_LEXICON_LANGUAGES, type LexiconLanguage, type ReviewLexicon } from './generated/review-lexicon';
import type { Severity } from './scoring';
import type { GuestReview, IsoDate } from './types';
import { REVIEW_TOPICS, type ReviewTopic } from './vocabulary';

export { REVIEW_LEXICON, type LexiconLanguage };

export interface ReviewSnippet {
  /** `s1`, `s2`, … in output order; the skill answers per id. */
  id: string;
  topicHint: ReviewTopic;
  date: IsoDate;
  lang: string;
  text: string;
  /** A negation stands within the three words before the keyword. */
  negated: boolean;
  keyword: string;
  /** Provider id of the review; one mention per review and topic is counted. */
  reviewRef: string;
}

/** Reviews of the period whose text names a topic without a negation. */
export interface TopicHits {
  topic: ReviewTopic;
  /** All of them: the snippets for the AI are capped (REVIEW_MAX_SNIPPETS_*). */
  reviews: number;
  /** The same weighted by age (MENTION_RECENT_*). */
  weighted: number;
}

/** What complaint shares are measured against: the base and the hits per topic. */
export interface MentionStats {
  /**
   * Reviews of the period the lexicon can read (its languages or unknown,
   * like praise), weighted by age (MENTION_RECENT_*). A review in another
   * language counts when a keyword hits it anyway.
   */
  base: number;
  hits: TopicHits[];
}

export interface ReviewScan {
  /** Reviews within REVIEW_MAX_AGE_MONTHS that were searched. */
  analyzed: number;
  mentions: MentionStats;
  /** Reviews loaded, and those of them not older than REVIEW_FRESH_MONTHS (weight of the review count). */
  loaded: number;
  freshCount: number;
  latestReviewDate: IsoDate | null;
  /** Mean score (0–10) of the reviews of the last RECENT_REVIEW_MONTHS. */
  recentRating: number | null;
  recentCount: number;
  snippets: ReviewSnippet[];
}

export interface SkillFinding {
  snippetId: string;
  topic: ReviewTopic;
  isComplaint: boolean;
  severity: Severity;
}

export interface TopicResult {
  topic: ReviewTopic;
  /** Snippets the skill confirmed as complaints. */
  confirmedCount: number;
  /** Keyword hits without AI verification (fallback), negations excluded. */
  unverifiedCount: number;
  /** Of the counted mentions: within the last REVIEW_RECENT_MONTHS_LABEL months. */
  recentCount: number;
  latestDate: IsoDate | null;
  severity: Severity | null;
  /**
   * Complaining guests among all checked reviews: the confirmed ones and,
   * where more reviews hit than the AI saw, the rest at the rate the AI
   * confirmed. Without AI every hit counts.
   */
  guests: number;
  /** Their share of the checked reviews, both weighted by age (MENTION_RECENT_*), 0–1. */
  share: number;
}

interface CompiledKeyword {
  topic: ReviewTopic;
  lang: LexiconLanguage;
  keyword: string;
  re: RegExp;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Age weight of a review in every mention count: praise, complaints and their base. */
export function mentionWeight(date: IsoDate, today: IsoDate): number {
  return date >= addMonths(today, -MENTION_RECENT_MONTHS) ? MENTION_RECENT_WEIGHT : 1;
}

/** Whole-word, case-insensitive matcher of a lexicon keyword (`*` for further letters). */
export function keywordRegex(keyword: string): RegExp {
  const lead = keyword.startsWith('*');
  const trail = keyword.endsWith('*');
  const core = keyword.replace(/^\*/, '').replace(/\*$/, '');
  const body = core.split(/\s+/).map(escapeRegex).join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${lead ? '\\p{L}*' : ''}${body}${trail ? '\\p{L}*' : ''}(?![\\p{L}\\p{N}])`, 'giu');
}

export function compileLexicon(lexicon: ReviewLexicon = REVIEW_LEXICON): CompiledKeyword[] {
  return REVIEW_TOPICS.flatMap((topic) =>
    REVIEW_LEXICON_LANGUAGES.flatMap((lang) => lexicon.topics[topic][lang].map((keyword) => ({ topic, lang, keyword, re: keywordRegex(keyword) }))),
  );
}

const DEFAULT_KEYWORDS = compileLexicon();

function isLexiconLanguage(value: string): value is LexiconLanguage {
  return (REVIEW_LEXICON_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Two-letter lexicon code of a review language ("es-ES" → "es"); Norwegian
 * Bokmål and Nynorsk (nb, nn) read as "no". Empty when unknown.
 */
export function lexiconLanguageCode(language: string | null): string {
  const lang = language?.slice(0, 2).toLowerCase() ?? '';
  return lang === 'nb' || lang === 'nn' ? 'no' : lang;
}

/** A review the lexicons can read: its language is one of theirs, or unknown. */
export function readableLanguage(language: string | null): boolean {
  const lang = lexiconLanguageCode(language);
  return lang === '' || isLexiconLanguage(lang);
}

function negationSet(language: string | null, lexicon: ReviewLexicon): Set<string> {
  const lang = lexiconLanguageCode(language);
  // Only the review's own language: "mai" is a negation in Italian but a
  // month in German. Unknown languages use all lists.
  const lists = isLexiconLanguage(lang) ? [lexicon.negations[lang]] : REVIEW_LEXICON_LANGUAGES.map((l) => lexicon.negations[l]);
  return new Set(lists.flat().map((w) => w.toLocaleLowerCase('de')));
}

/** Three words before the hit, within the same sentence. */
function isNegated(text: string, start: number, keyword: string, negations: Set<string>): boolean {
  const sentenceStart = Math.max(...['.', '!', '?', ';', '\n'].map((c) => text.lastIndexOf(c, start - 1))) + 1;
  const before = text
    .slice(sentenceStart, start)
    .toLocaleLowerCase('de')
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean)
    .slice(-3);
  // A keyword that carries its own negation ("nicht sauber") is a complaint.
  const ownWords = keyword.replace(/\*/g, '').split(/\s+/);
  if (ownWords.some((w) => negations.has(w))) return false;
  return before.some((w) => negations.has(w));
}

function snippetAround(text: string, start: number, end: number): string {
  let from = Math.max(0, start - REVIEW_SNIPPET_RADIUS);
  let to = Math.min(text.length, end + REVIEW_SNIPPET_RADIUS);
  // Do not cut words in half.
  if (from > 0) {
    const space = text.indexOf(' ', from);
    if (space >= 0 && space < start) from = space + 1;
  }
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to);
    if (space > end) to = space;
  }
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

const normalize = (s: string) => redactContactData(s.replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim());

interface Candidate extends Omit<ReviewSnippet, 'id'> {
  reviewIndex: number;
}

/**
 * Keyword scan of a hotel's reviews relative to `today`. One snippet per
 * review and topic (the first non-negated hit, else the first hit); per topic
 * at most REVIEW_MAX_SNIPPETS_PER_TOPIC, in total REVIEW_MAX_SNIPPETS_TOTAL,
 * non-negated and newer hits first.
 */
export function scanReviews(reviews: readonly GuestReview[], today: IsoDate, keywords: readonly CompiledKeyword[] = DEFAULT_KEYWORDS, lexicon: ReviewLexicon = REVIEW_LEXICON): ReviewScan {
  const cutoff = addMonths(today, -REVIEW_MAX_AGE_MONTHS);
  const recentFrom = addMonths(today, -RECENT_REVIEW_MONTHS);
  const usable = reviews.filter((r): r is GuestReview & { date: IsoDate } => r.date !== null && r.date >= cutoff && r.date <= today);
  const recent = usable.filter((r) => r.date >= recentFrom && r.score !== null);
  const recentRating = recent.length === 0 ? null : Math.round((recent.reduce((s, r) => s + (r.score as number), 0) / recent.length) * 100) / 100;

  const candidates: Candidate[] = [];
  const hits = new Map<ReviewTopic, TopicHits>();
  let base = 0;
  usable.forEach((review, reviewIndex) => {
    const negations = negationSet(review.language, lexicon);
    const fields = [review.headline, review.cons, review.pros].filter((f): f is string => !!f && f.trim().length > 0).map(normalize);
    const perTopic = new Map<ReviewTopic, Candidate>();
    for (const text of fields) {
      for (const k of keywords) {
        const current = perTopic.get(k.topic);
        if (current && !current.negated) continue;
        k.re.lastIndex = 0;
        for (let m = k.re.exec(text); m; m = k.re.exec(text)) {
          const negated = isNegated(text, m.index, k.keyword, negations);
          const known = perTopic.get(k.topic);
          if (!known || (known.negated && !negated)) {
            perTopic.set(k.topic, {
              reviewIndex,
              topicHint: k.topic,
              date: review.date,
              lang: review.language?.slice(0, 8) ?? k.lang,
              text: snippetAround(text, m.index, m.index + m[0].length),
              negated,
              keyword: k.keyword,
              reviewRef: review.id,
            });
          }
          if (!negated) break;
        }
      }
    }
    candidates.push(...perTopic.values());
    const weight = mentionWeight(review.date, today);
    let hit = false;
    for (const c of perTopic.values()) {
      if (c.negated) continue;
      hit = true;
      const h = hits.get(c.topicHint) ?? { topic: c.topicHint, reviews: 0, weighted: 0 };
      h.reviews += 1;
      h.weighted += weight;
      hits.set(c.topicHint, h);
    }
    if (hit || readableLanguage(review.language)) base += weight;
  });

  const byPriority = (a: Candidate, b: Candidate) => Number(a.negated) - Number(b.negated) || b.date.localeCompare(a.date) || a.reviewIndex - b.reviewIndex;
  const perTopicCapped = REVIEW_TOPICS.flatMap((topic) => candidates.filter((c) => c.topicHint === topic).sort(byPriority).slice(0, REVIEW_MAX_SNIPPETS_PER_TOPIC));
  const selected = perTopicCapped.sort(byPriority).slice(0, REVIEW_MAX_SNIPPETS_TOTAL);
  const freshFrom = addMonths(today, -REVIEW_FRESH_MONTHS);
  return {
    analyzed: usable.length,
    mentions: { base, hits: REVIEW_TOPICS.flatMap((topic) => hits.get(topic) ?? []) },
    loaded: reviews.length,
    freshCount: reviews.filter((r) => r.date !== null && r.date >= freshFrom && r.date <= today).length,
    latestReviewDate: usable.reduce<IsoDate | null>((max, r) => (max === null || r.date > max ? r.date : max), null),
    recentRating,
    recentCount: recent.length,
    snippets: selected.map(({ reviewIndex: _r, ...s }, i) => ({ ...s, id: `s${i + 1}` })),
  };
}

const maxSeverity = (a: Severity | null, b: Severity): Severity => (a === null || SEVERITY_WEIGHTS[b] > SEVERITY_WEIGHTS[a] ? b : a);

type Counted = Omit<TopicResult, 'guests' | 'share'> & { weighted: number };

const round2 = (v: number) => Math.round(v * 100) / 100;
const shareOf = (weighted: number, base: number) => (base > 0 ? round2(Math.min(1, weighted / base)) : 0);

/**
 * Aggregation of the skill's findings (6.10 step 6); topics without complaints
 * are left out. `stats` are the scan's hits over all checked reviews: where
 * a topic hit more reviews than the AI saw, the rest counts at the rate the
 * AI confirmed among the topic's non-negated snippets.
 */
export function aggregateFindings(snippets: readonly ReviewSnippet[], findings: readonly SkillFinding[], today: IsoDate, stats: MentionStats): TopicResult[] {
  const recentFrom = addMonths(today, -REVIEW_RECENT_MONTHS_LABEL);
  const byId = new Map(snippets.map((s) => [s.id, s]));
  const topics = new Map<ReviewTopic, Counted>();
  const seen = new Set<string>();
  const counted = new Set<string>();
  /** Snippet ids the skill confirmed as a complaint on the snippet's own topic. */
  const confirmedOwn = new Set<string>();
  for (const f of findings) {
    const snippet = byId.get(f.snippetId);
    if (!snippet || !f.isComplaint || seen.has(f.snippetId)) continue;
    seen.add(f.snippetId);
    if (f.topic === snippet.topicHint) confirmedOwn.add(snippet.id);
    // Two snippets of one review can land on the same topic ("Schimmelflecken"
    // hits `schimmel` and `sauberkeit`); that is one mention.
    const mention = `${snippet.reviewRef}|${f.topic}`;
    if (counted.has(mention)) {
      const t = topics.get(f.topic);
      if (t) t.severity = maxSeverity(t.severity, f.severity);
      continue;
    }
    counted.add(mention);
    const t = topics.get(f.topic) ?? { topic: f.topic, confirmedCount: 0, unverifiedCount: 0, recentCount: 0, latestDate: null, severity: null, weighted: 0 };
    t.confirmedCount += 1;
    t.weighted += mentionWeight(snippet.date, today);
    if (snippet.date >= recentFrom) t.recentCount += 1;
    if (t.latestDate === null || snippet.date > t.latestDate) t.latestDate = snippet.date;
    t.severity = maxSeverity(t.severity, f.severity);
    topics.set(f.topic, t);
  }
  return REVIEW_TOPICS.flatMap((topic) => {
    const t = topics.get(topic);
    if (!t) return [];
    const { weighted, ...result } = t;
    const sample = snippets.filter((s) => s.topicHint === topic && !s.negated);
    const hit = stats.hits.find((h) => h.topic === topic);
    const rate = sample.length > 0 ? sample.filter((s) => confirmedOwn.has(s.id)).length / sample.length : 0;
    const restReviews = Math.max(0, (hit?.reviews ?? 0) - sample.length);
    const restWeighted = Math.max(0, (hit?.weighted ?? 0) - sample.reduce((sum, s) => sum + mentionWeight(s.date, today), 0));
    return [{ ...result, guests: round2(t.confirmedCount + restReviews * rate), share: shareOf(weighted + restWeighted * rate, stats.base) }];
  });
}

/**
 * Fallback without AI (6.10 step 7): non-negated hits as unverified mentions,
 * no severity. Guests and share count every hit of the scan, not only the
 * snippets.
 */
export function aggregateUnverified(snippets: readonly ReviewSnippet[], today: IsoDate, stats: MentionStats): TopicResult[] {
  const recentFrom = addMonths(today, -REVIEW_RECENT_MONTHS_LABEL);
  const topics = new Map<ReviewTopic, Counted>();
  for (const s of snippets) {
    if (s.negated) continue;
    const t = topics.get(s.topicHint) ?? { topic: s.topicHint, confirmedCount: 0, unverifiedCount: 0, recentCount: 0, latestDate: null, severity: null, weighted: 0 };
    t.unverifiedCount += 1;
    t.weighted += mentionWeight(s.date, today);
    if (s.date >= recentFrom) t.recentCount += 1;
    if (t.latestDate === null || s.date > t.latestDate) t.latestDate = s.date;
    topics.set(s.topicHint, t);
  }
  return REVIEW_TOPICS.flatMap((topic) => {
    const t = topics.get(topic);
    if (!t) return [];
    const { weighted, ...result } = t;
    const hit = stats.hits.find((h) => h.topic === topic);
    const guests = Math.max(t.unverifiedCount, hit?.reviews ?? 0);
    return [{ ...result, guests, share: shareOf(Math.max(weighted, hit?.weighted ?? 0), stats.base) }];
  });
}
