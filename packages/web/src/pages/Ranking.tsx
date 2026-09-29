// "So berechnen wir die Rangliste" (konzept.md 9.5, legal transparency of
// the main ranking criteria): quality score, price order, the recommendation
// "Unsere Wahl" (comparison price), bargains, the pre-selection of "Deine
// Auswahl", red flags and the praise labels (9.9–9.11). Values come from packages/domain
// constants, so the page always states the rules in force.
import { constants } from '@reiseplaner/domain';
import { Card, Heading, Text } from '@reiseplaner/ui';
import { de } from '../i18n/de';

const t = de.ranking;

export function Ranking() {
  const pct = (share: number) => Math.round(share * 100);
  const points = constants.GOAL_QUALITY_BONUS_PER_POINT;
  const limit = (l: { guests: number; share: number }) => ({ guests: l.guests, share: pct(l.share) });
  const flags = constants.RED_FLAG_THRESHOLDS;
  const redFlagLimits = { schimmel: limit(flags.schimmel), ungeziefer: limit(flags.ungeziefer), sauberkeit: limit(flags.sauberkeit) };
  const flat = constants.RED_FLAG_THRESHOLDS_BY_KIND.ferienwohnung;
  const flatLimits = { schimmel: limit(flat.schimmel), ungeziefer: limit(flat.ungeziefer), sauberkeit: limit(flat.sauberkeit) };
  const sections: Array<[string, string]> = [
    [t.qualityTitle, t.quality(constants.SCORE_FULL_WEIGHT_REVIEWS_BY_KIND, constants.REVIEW_FRESH_MONTHS)],
    [t.priceTitle, t.price],
    [
      t.recommendTitle,
      t.recommend(
        { sparen: pct(points.sparen), ausgewogen: pct(points.ausgewogen), komfort: pct(points.komfort) },
        constants.MANY_REVIEWS_MIN_BY_KIND,
        pct(constants.MANY_REVIEWS_BONUS),
        pct(constants.KOMFORT_EXTRA_BONUS),
        pct(constants.KOMFORT_EXTRAS_BONUS_MAX),
      ),
    ],
    [t.bargainTitle, t.bargain(pct(1 - constants.BARGAIN_DATE_FACTOR), constants.BARGAIN_DATE_MIN_DATES)],
    [t.finaleTitle, t.finale(constants.STAR_TRAP_MIN_STARS, constants.FINALISTS_MAX)],
    [t.redFlagTitle, t.redFlag(redFlagLimits, constants.MENTION_RECENT_MONTHS, constants.MENTION_RECENT_WEIGHT, flatLimits)],
    [t.praiseTitle, t.praise(constants.PRAISE_MIN_MENTIONS, pct(constants.PRAISE_MIN_SHARE))],
    [t.placesTitle, t.places(constants.ATTRACTIVENESS_LEVELS.top, constants.ATTRACTIVENESS_LEVELS.beliebt, constants.ATTRACTIVENESS_LEVELS.ruhig)],
    [t.sortTitle, t.sort],
    [t.otherTitle, t.other],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <Heading level={1}>{t.title}</Heading>
      <Text>{t.intro}</Text>
      {sections.map(([title, text]) => (
        <Card key={title} className="space-y-2" id={title === t.placesTitle ? 'orte' : undefined}>
          <Heading level={2}>{title}</Heading>
          <Text>{text}</Text>
        </Card>
      ))}
    </div>
  );
}
