// Aufgabe F18: reviews of local guests in the European destinations. The
// keyword stage and the praise count read ten more languages; they are not
// translated, the words that matter for our criteria are recognised directly.
import { describe, expect, it } from 'vitest';
import { countPraise, lexiconLanguageCode, readableLanguage, scanReviews, type GuestReview } from '../src';
import fixture from './fixtures/reviews_case_1.json' with { type: 'json' };

const today = '2026-09-28';
let n = 0;
const review = (cons: string, language: string | null, pros: string | null = null): GuestReview => ({
  id: `l${(n += 1)}`,
  score: 7,
  date: '2026-08-01',
  language,
  headline: null,
  pros,
  cons,
});
const topicsOf = (text: string, language: string | null) =>
  scanReviews([review(text, language)], today).snippets.map((s) => `${s.topicHint}${s.negated ? '(negiert)' : ''}`);

describe('complaints in the languages of the European destinations', () => {
  it.each([
    ['es', 'Había moho en el baño y la habitación estaba sucia.', ['sauberkeit', 'schimmel']],
    ['pt', 'Muito barulho à noite e cheiro a mofo.', ['geruch', 'laerm', 'schimmel']],
    ['pl', 'W łazience była pleśń, a pościel była brudna.', ['sauberkeit', 'schimmel']],
    ['cs', 'Na zdi byla plíseň a v noci velký hluk.', ['laerm', 'schimmel']],
    ['hr', 'Soba je bila prljava, a klima nije radila.', ['sauberkeit', 'zustand']],
    ['hu', 'Penészes volt a fürdő, és nagy zaj volt éjjel.', ['laerm', 'schimmel']],
    ['da', 'Der var skimmel i badeværelset.', ['schimmel']],
    ['sv', 'Mögel i duschen och kackerlackor i köket.', ['schimmel', 'ungeziefer']],
    ['no', 'Rommet var skittent og det var mugg på badet.', ['sauberkeit', 'schimmel']],
    ['el', 'Υπήρχε μούχλα στο μπάνιο και κατσαρίδες.', ['schimmel', 'ungeziefer']],
  ])('%s: finds the complaint topics', (lang, text, topics) => {
    expect([...new Set(topicsOf(text, lang))].sort()).toEqual(topics);
  });

  it('marks negations in the new languages', () => {
    expect(topicsOf('No había ruido por la noche.', 'es')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Nie było żadnego hałasu.', 'pl')).toEqual(['laerm(negiert)']);
    expect(topicsOf('Ingen mögel alls.', 'sv')).toEqual(['schimmel(negiert)']);
    expect(topicsOf('Δεν υπήρχε θόρυβος.', 'el')).toEqual(['laerm(negiert)']);
  });

  it('reads Norwegian Bokmål and Nynorsk as Norwegian', () => {
    expect(lexiconLanguageCode('nb-NO')).toBe('no');
    expect(lexiconLanguageCode('nn')).toBe('no');
    expect(readableLanguage('es-ES')).toBe(true);
    expect(readableLanguage('ja')).toBe(false);
  });

  it('finds no new false complaints in the German and English fixture', () => {
    // Words of the new languages must not fire on typical German texts.
    expect(topicsOf('Das Zimmer war kurz vor unserer Ankunft renoviert, ein Damm am See, sehr schön.', 'de')).toEqual([]);
    expect(topicsOf('Kurzer Weg zum Strand, ruhiges Haus, tolles Frühstück.', null)).toEqual([]);
    const scan = scanReviews(fixture.reviews as GuestReview[], fixture.today);
    expect(new Set(scan.snippets.map((s) => s.topicHint))).toEqual(
      new Set(['schimmel', 'geruch', 'sauberkeit', 'laerm', 'zustand', 'abweichung_beschreibung', 'ungeziefer']),
    );
  });
});

describe('praise in the languages of the European destinations', () => {
  const count = (reviews: GuestReview[]) => Object.fromEntries(countPraise(reviews, today).map((c) => [c.topic, [c.praised, c.criticized]]));

  it('counts breakfast, cleanliness, staff and location in Spanish, Italian neighbours and Greek', () => {
    expect(
      count([
        review('', 'es', 'Desayuno excelente y personal muy amable.'),
        review('La cama era incómoda.', 'es', 'Habitación muy limpia, ubicación perfecta.'),
        review('', 'el', 'Υπέροχη θέα και καθαρό δωμάτιο.'),
        review('', 'pl', 'Śniadanie bardzo dobre.'),
      ]),
    ).toEqual({ fruehstueck: [2, 0], personal: [1, 0], sauberkeit: [2, 0], lage: [1, 0], betten: [0, 1], aussicht: [1, 0] });
  });
});
