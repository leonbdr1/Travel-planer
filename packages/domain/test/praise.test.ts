// Praise labels (konzept.md 9.11): counted from the positive and negative
// fields, labels only with enough praise, a clear share and no warning.
import { describe, expect, it } from 'vitest';
import { constants, countPraise, praiseLabels, type GuestReview } from '../src';

const today = '2026-09-28';
let n = 0;
const review = (pros: string | null, cons: string | null, language: string | null = 'de', date: string | null = '2026-08-01'): GuestReview => ({
  id: `r${(n += 1)}`,
  score: 8,
  date,
  language,
  headline: 'Headline mit Frühstück zählt nicht',
  pros,
  cons,
});
const count = (reviews: GuestReview[]) => Object.fromEntries(countPraise(reviews, today).map((c) => [c.topic, [c.praised, c.criticized]]));

describe('countPraise', () => {
  it('counts a topic word in the positive field as praise and in the negative field as criticism', () => {
    expect(
      count([
        review('Ein reichhaltiges Frühstück und sehr freundliches Personal.', 'Die Betten waren etwas weich.'),
        review('Frühstücksbuffet top!', 'Beim Frühstück fehlte uns Auswahl.'),
      ]),
    ).toEqual({ fruehstueck: [2, 1], personal: [1, 0], betten: [0, 1] });
  });

  it('counts each review once per topic and field, and ignores the headline', () => {
    expect(count([review('Frühstück super, Frühstücksraum schön, Buffet reichhaltig.', null)])).toEqual({ fruehstueck: [1, 0] });
  });

  it('matches compounds and endings but not look-alike words', () => {
    expect(count([review('Blitzsauberes Zimmer, traumhafter Seeblick.', null)])).toEqual({ sauberkeit: [1, 0], aussicht: [1, 0] });
    // "Augenblick" is no view, "Klimaanlage" no location, "laut Beschreibung" no noise.
    expect(count([review(null, 'Im Augenblick keine Klimaanlage, laut Beschreibung sollte eine da sein.')])).toEqual({});
  });

  it('skips the first sentence of a negative field that opens with "nothing"', () => {
    expect(count([review('Alles sauber.', 'Nichts, alles war sauber und ruhig.')])).toEqual({ sauberkeit: [1, 0] });
    expect(count([review(null, 'Nothing to complain about. The breakfast was a bit basic.', 'en')])).toEqual({ fruehstueck: [0, 1] });
  });

  it('uses the lists of the review language, all lists when the language is unknown', () => {
    // Dutch "lage prijs" is a low price, not the German "Lage".
    expect(count([review('Lage prijs, schone kamer.', null, 'nl')])).toEqual({ sauberkeit: [1, 0] });
    expect(count([review('Colazione ottima, posizione centrale.', null, 'it')])).toEqual({ fruehstueck: [1, 0], lage: [1, 0] });
    expect(count([review('Great breakfast, tolle Lage.', null, null)])).toEqual({ fruehstueck: [1, 0], lage: [1, 0] });
  });

  it('leaves reviews in languages the lexicon cannot read out of counts and base', () => {
    // Real houses get reviews in many languages (Füssen: Japanese, Chinese, Russian …);
    // unreadable ones must not dilute the share of the readable ones.
    const [c] = countPraise(
      [
        review('Tolles Frühstück.', null, 'de'),
        review('Great breakfast.', null, 'en-gb'),
        review('朝食が美味しかった。', null, 'ja'),
        review('Отличный завтрак, breakfast.', null, 'ru'),
        review('Desayuno excelente.', null, 'es'),
      ],
      today,
    );
    expect(c).toMatchObject({ topic: 'fruehstueck', praised: 2, reviewsWeighted: 2 * constants.PRAISE_RECENT_WEIGHT });
  });

  it('weights reviews of the last months up, for the praise and for the base', () => {
    const [c] = countPraise([review('Tolles Frühstück.', null, 'de', '2026-09-01'), review('Tolles Frühstück.', null, 'de', '2025-06-01'), review('Schönes Zimmer.', null, 'de', '2025-06-01')], today);
    expect(c).toMatchObject({ topic: 'fruehstueck', praised: 2, praisedWeighted: constants.PRAISE_RECENT_WEIGHT + 1, reviewsWeighted: constants.PRAISE_RECENT_WEIGHT + 2 });
  });

  it('only counts reviews of the last 24 months', () => {
    expect(count([review('Tolles Frühstück.', null, 'de', '2024-09-01'), review('Tolles Frühstück.', null, 'de', '2026-09-01')])).toEqual({ fruehstueck: [1, 0] });
    expect(count([review('Tolles Frühstück.', null, 'de', null)])).toEqual({});
  });
});

describe('praiseLabels', () => {
  const none = new Set<string>();
  it('needs enough praise and a clear share', () => {
    expect(praiseLabels([{ topic: 'fruehstueck', praised: constants.PRAISE_MIN_MENTIONS - 1, criticized: 0 }], none)).toEqual([]);
    expect(praiseLabels([{ topic: 'fruehstueck', praised: constants.PRAISE_MIN_MENTIONS, criticized: 0 }], none)).toEqual(['fruehstueck']);
    // 23× praised, 2× criticised: 92 % → label. 8× praised, 3× criticised: 73 % → none.
    expect(praiseLabels([{ topic: 'fruehstueck', praised: 23, criticized: 2 }, { topic: 'lage', praised: 8, criticized: 3 }], none)).toEqual(['fruehstueck']);
  });

  it('is relative to the review volume: 3 of 1000 guests are no label, 3 of 40 are', () => {
    const base = { topic: 'fruehstueck', praised: 3, criticized: 0, praisedWeighted: 3, criticizedWeighted: 0 };
    expect(praiseLabels([{ ...base, reviewsWeighted: 1000 }], none)).toEqual([]);
    expect(praiseLabels([{ ...base, reviewsWeighted: 40 }], none)).toEqual(['fruehstueck']);
    // 5 % of 1000 reviews: 50 praising guests.
    const many = { ...base, praised: 50, praisedWeighted: constants.PRAISE_MIN_REVIEW_SHARE * 1000, reviewsWeighted: 1000 };
    expect(praiseLabels([many], none)).toEqual(['fruehstueck']);
  });

  it('never shows "Besonders sauber" next to a warning about dirt, mould, vermin or smell', () => {
    const clean = [{ topic: 'sauberkeit', praised: 30, criticized: 1 }];
    expect(praiseLabels(clean, none)).toEqual(['sauberkeit']);
    for (const warning of ['sauberkeit', 'schimmel', 'ungeziefer', 'geruch']) expect(praiseLabels(clean, new Set([warning]))).toEqual([]);
    // A noise warning blocks "Ruhig" but not "Besonders sauber".
    expect(praiseLabels([...clean, { topic: 'ruhe', praised: 12, criticized: 0 }], new Set(['laerm']))).toEqual(['sauberkeit']);
  });

  it('lists the most praised first and ignores unknown topics', () => {
    expect(
      praiseLabels(
        [
          { topic: 'lage', praised: 9, criticized: 0 },
          { topic: 'personal', praised: 20, criticized: 1 },
          { topic: 'wlan', praised: 50, criticized: 0 },
        ],
        none,
      ),
    ).toEqual(['personal', 'lage']);
  });
});
