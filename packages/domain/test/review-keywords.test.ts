import { describe, expect, it } from 'vitest';
import fixture from './fixtures/reviews_case_1.json' with { type: 'json' };
import { constants, aggregateFindings, aggregateUnverified, scanReviews, type GuestReview, type SkillFinding } from '../src';

const today = fixture.today;
const reviews = fixture.reviews as GuestReview[];
const review = (cons: string, language: string | null = 'de', date = '2026-09-01'): GuestReview => ({
  id: 'x',
  score: 7,
  date,
  language,
  headline: null,
  pros: null,
  cons,
});
const topicsOf = (text: string, language: string | null = 'de') =>
  scanReviews([review(text, language)], today).snippets.map((s) => `${s.topicHint}${s.negated ? '(negiert)' : ''}`);

describe('review keyword scan (architektur.md 6.10)', () => {
  it('finds complaints per topic in the fixture with snippet ids and dates', () => {
    const scan = scanReviews(reviews, today);
    expect(scan.analyzed).toBe(13); // r10 is older than 24 months, r15 has no date
    const mold = scan.snippets.filter((s) => s.topicHint === 'schimmel');
    expect(mold.map((s) => [s.date, s.negated])).toEqual([
      ['2026-09-10', false],
      ['2026-08-02', false],
      ['2026-06-15', false],
      ['2026-05-20', true],
    ]);
    expect(scan.snippets.map((s) => s.id)).toEqual(scan.snippets.map((_, i) => `s${i + 1}`));
    expect(new Set(scan.snippets.map((s) => s.topicHint))).toEqual(
      new Set(['schimmel', 'geruch', 'sauberkeit', 'laerm', 'zustand', 'abweichung_beschreibung', 'ungeziefer']),
    );
  });

  it('derives recent rating and count from the last 12 months', () => {
    const scan = scanReviews(reviews, today);
    const recent = reviews.filter((r) => r.date !== null && r.date >= '2025-09-27' && r.score !== null);
    expect(scan.recentCount).toBe(recent.length);
    expect(scan.recentRating).toBeCloseTo(recent.reduce((s, r) => s + (r.score ?? 0), 0) / recent.length, 2);
    expect(scan.latestReviewDate).toBe('2026-09-10');
  });

  it('matches whole words only, with compounds via wildcards', () => {
    expect(topicsOf('La salle de bain était grande.', 'fr')).toEqual([]);
    expect(topicsOf('The chair was comfortable.', 'en')).toEqual([]);
    expect(topicsOf('Schimmelbefall im Bad.')).toEqual(['schimmel']);
    expect(topicsOf('Straßenlärm die ganze Nacht.')).toEqual(['laerm']);
    expect(topicsOf('SCHIMMEL IM BAD!')).toEqual(['schimmel']);
    expect(topicsOf('Laut Beschreibung gibt es einen Parkplatz.')).toEqual([]);
  });

  it('marks negations in five languages, only within the sentence', () => {
    expect(topicsOf('Kein Schimmel, alles sauber.')).toEqual(['schimmel(negiert)']);
    expect(topicsOf('There was no noise at all.', 'en')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Pas de bruit la nuit.', 'fr')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Nessun rumore, dormito benissimo.', 'it')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Geen lawaai van de straat.', 'nl')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Kein Frühstück. Schimmel im Bad.')).toEqual(['schimmel']);
    expect(topicsOf('Das Bad war nicht sauber.')).toEqual(['sauberkeit']);
    // "mai" is an Italian negation, but a month in German reviews.
    expect(topicsOf('Im Mai war es sehr laut.')).toEqual(['laerm']);
  });

  it('prefers a real hit over a negated one in the same review', () => {
    expect(topicsOf('Geen lawaai van buiten, maar de kamer was erg gehorig.', 'nl')).toEqual(['laerm']);
  });

  it('cuts snippets to ±radius characters without breaking words', () => {
    const long = `${'Wir waren insgesamt sehr zufrieden mit dem Aufenthalt und dem Essen. '.repeat(4)}Leider Schimmel im Bad. ${'Das Personal war immer freundlich und hilfsbereit, auch am Abend. '.repeat(4)}`;
    const [snippet] = scanReviews([review(long)], today).snippets;
    expect(snippet?.text.startsWith('…')).toBe(true);
    expect(snippet?.text.endsWith('…')).toBe(true);
    expect(snippet?.text).toContain('Schimmel im Bad');
    expect((snippet?.text.length ?? 0) <= 2 * constants.REVIEW_SNIPPET_RADIUS + 'Schimmel'.length + 2).toBe(true);
  });

  it('caps snippets per topic and in total', () => {
    const many = Array.from({ length: 9 }, (_, i) => review('Schimmel im Bad.', 'de', `2026-09-${String(i + 1).padStart(2, '0')}`));
    const mold = scanReviews(many, today).snippets;
    expect(mold).toHaveLength(constants.REVIEW_MAX_SNIPPETS_PER_TOPIC);
    expect(mold[0]?.date).toBe('2026-09-09');
    const texts = ['Schimmel im Bad.', 'Sehr laut.', 'Bettwanzen!', 'Es stinkt.', 'Alles kaputt.', 'Das Bad war schmutzig.', 'Nicht wie beschrieben.'];
    const all = Array.from({ length: 35 }, (_, i) => review(texts[i % texts.length] ?? '', 'de', `2026-08-${String((i % 28) + 1).padStart(2, '0')}`));
    expect(scanReviews(all, today).snippets).toHaveLength(constants.REVIEW_MAX_SNIPPETS_TOTAL);
  });

  it('aggregates confirmed findings: count, recent count, latest date, highest severity', () => {
    const scan = scanReviews(reviews, today);
    const findings: SkillFinding[] = scan.snippets.map((s) => ({
      snippetId: s.id,
      topic: s.topicHint,
      isComplaint: !s.negated,
      severity: s.topicHint === 'schimmel' ? 'high' : 'medium',
    }));
    const topics = aggregateFindings(scan.snippets, findings, today);
    expect(topics.find((t) => t.topic === 'schimmel')).toEqual({
      topic: 'schimmel',
      confirmedCount: 3,
      unverifiedCount: 0,
      recentCount: 3,
      latestDate: '2026-09-10',
      severity: 'high',
    });
    expect(topics.find((t) => t.topic === 'laerm')).toMatchObject({ confirmedCount: 2, recentCount: 0, latestDate: '2026-02-01' });
    // Unknown snippet ids and duplicate answers are ignored.
    expect(aggregateFindings(scan.snippets, [...findings, { snippetId: 'zz', topic: 'schimmel', isComplaint: true, severity: 'high' }, findings[0] as SkillFinding], today)).toEqual(topics);
  });

  it('counts one mention per review and topic when two snippets land on the same topic', () => {
    const scan = scanReviews([review('Schimmelflecken an der Wand.')], today);
    expect(scan.snippets.map((s) => s.topicHint).sort()).toEqual(['sauberkeit', 'schimmel']);
    const findings: SkillFinding[] = scan.snippets.map((s) => ({ snippetId: s.id, topic: 'schimmel', isComplaint: true, severity: s.topicHint === 'schimmel' ? 'high' : 'medium' }));
    expect(aggregateFindings(scan.snippets, findings, today)).toEqual([
      { topic: 'schimmel', confirmedCount: 1, unverifiedCount: 0, recentCount: 1, latestDate: '2026-09-01', severity: 'high' },
    ]);
  });

  it('counts non-negated hits as unverified without severity in the fallback', () => {
    const scan = scanReviews(reviews, today);
    const mold = aggregateUnverified(scan.snippets, today).find((t) => t.topic === 'schimmel');
    expect(mold).toEqual({ topic: 'schimmel', confirmedCount: 0, unverifiedCount: 3, recentCount: 3, latestDate: '2026-09-10', severity: null });
  });
});
