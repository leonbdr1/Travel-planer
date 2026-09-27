// Keyword stage of the review check (architektur.md 6.10, steps 3–7): drop
// old reviews, derive recent rating and count, find complaint keywords per
// topic (whole words, case-insensitive, five languages), cut snippets of
// ±REVIEW_SNIPPET_RADIUS characters, cap them per topic and in total, and
// aggregate the skill's findings (or, without AI, the unverified hits).
// Author names never reach this module: the provider adapter drops them;
// e-mail addresses and phone numbers are masked before snippets are cut.
import {
  RECENT_REVIEW_MONTHS,
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

export interface ReviewScan {
  /** Reviews within REVIEW_MAX_AGE_MONTHS that were searched. */
  analyzed: number;
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
}

interface CompiledKeyword {
  topic: ReviewTopic;
  lang: LexiconLanguage;
  keyword: string;
  re: RegExp;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function keywordRegex(keyword: string): RegExp {
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

function negationSet(language: string | null, lexicon: ReviewLexicon): Set<string> {
  const lang = language?.slice(0, 2).toLowerCase() ?? '';
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
  });

  const byPriority = (a: Candidate, b: Candidate) => Number(a.negated) - Number(b.negated) || b.date.localeCompare(a.date) || a.reviewIndex - b.reviewIndex;
  const perTopicCapped = REVIEW_TOPICS.flatMap((topic) => candidates.filter((c) => c.topicHint === topic).sort(byPriority).slice(0, REVIEW_MAX_SNIPPETS_PER_TOPIC));
  const selected = perTopicCapped.sort(byPriority).slice(0, REVIEW_MAX_SNIPPETS_TOTAL);
  return {
    analyzed: usable.length,
    latestReviewDate: usable.reduce<IsoDate | null>((max, r) => (max === null || r.date > max ? r.date : max), null),
    recentRating,
    recentCount: recent.length,
    snippets: selected.map(({ reviewIndex: _r, ...s }, i) => ({ ...s, id: `s${i + 1}` })),
  };
}

const maxSeverity = (a: Severity | null, b: Severity): Severity => (a === null || SEVERITY_WEIGHTS[b] > SEVERITY_WEIGHTS[a] ? b : a);

/** Aggregation of the skill's findings (6.10 step 6); topics without complaints are left out. */
export function aggregateFindings(snippets: readonly ReviewSnippet[], findings: readonly SkillFinding[], today: IsoDate): TopicResult[] {
  const recentFrom = addMonths(today, -REVIEW_RECENT_MONTHS_LABEL);
  const byId = new Map(snippets.map((s) => [s.id, s]));
  const topics = new Map<ReviewTopic, TopicResult>();
  const seen = new Set<string>();
  const counted = new Set<string>();
  for (const f of findings) {
    const snippet = byId.get(f.snippetId);
    if (!snippet || !f.isComplaint || seen.has(f.snippetId)) continue;
    seen.add(f.snippetId);
    // Two snippets of one review can land on the same topic ("Schimmelflecken"
    // hits `schimmel` and `sauberkeit`); that is one mention.
    const mention = `${snippet.reviewRef}|${f.topic}`;
    if (counted.has(mention)) {
      const t = topics.get(f.topic);
      if (t) t.severity = maxSeverity(t.severity, f.severity);
      continue;
    }
    counted.add(mention);
    const t = topics.get(f.topic) ?? { topic: f.topic, confirmedCount: 0, unverifiedCount: 0, recentCount: 0, latestDate: null, severity: null };
    t.confirmedCount += 1;
    if (snippet.date >= recentFrom) t.recentCount += 1;
    if (t.latestDate === null || snippet.date > t.latestDate) t.latestDate = snippet.date;
    t.severity = maxSeverity(t.severity, f.severity);
    topics.set(f.topic, t);
  }
  return REVIEW_TOPICS.map((topic) => topics.get(topic)).filter((t): t is TopicResult => t !== undefined);
}

/** Fallback without AI (6.10 step 7): non-negated hits as unverified mentions, no severity. */
export function aggregateUnverified(snippets: readonly ReviewSnippet[], today: IsoDate): TopicResult[] {
  const recentFrom = addMonths(today, -REVIEW_RECENT_MONTHS_LABEL);
  const topics = new Map<ReviewTopic, TopicResult>();
  for (const s of snippets) {
    if (s.negated) continue;
    const t = topics.get(s.topicHint) ?? { topic: s.topicHint, confirmedCount: 0, unverifiedCount: 0, recentCount: 0, latestDate: null, severity: null };
    t.unverifiedCount += 1;
    if (s.date >= recentFrom) t.recentCount += 1;
    if (t.latestDate === null || s.date > t.latestDate) t.latestDate = s.date;
    topics.set(s.topicHint, t);
  }
  return REVIEW_TOPICS.map((topic) => topics.get(topic)).filter((t): t is TopicResult => t !== undefined);
}
