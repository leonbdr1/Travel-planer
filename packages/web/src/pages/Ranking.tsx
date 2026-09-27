// "So berechnen wir die Rangliste" (konzept.md 9.5, legal transparency of
// the main ranking criteria). Weights come from packages/domain constants.
import { constants } from '@reiseplaner/domain';
import { Card, Heading, Text } from '@reiseplaner/ui';
import { de } from '../i18n/de';

const t = de.ranking;

export function Ranking() {
  const sections: Array<[string, string]> = [
    [t.qualityTitle, t.quality],
    [t.priceTitle, `${t.price} ${t.weights(Math.round(constants.RANK_W_QUALITY * 100), Math.round(constants.RANK_W_PRICE * 100), Math.round(constants.RANK_BARGAIN_BONUS * 100))}`],
    [t.bargainTitle, t.bargain],
    [t.sortTitle, t.sort],
    [t.otherTitle, t.other],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <Heading level={1}>{t.title}</Heading>
      <Text>{t.intro}</Text>
      {sections.map(([title, text]) => (
        <Card key={title} className="space-y-2">
          <Heading level={2}>{title}</Heading>
          <Text>{text}</Text>
        </Card>
      ))}
    </div>
  );
}
