// "So filtern wir" (Aufgabe 9): what the price matrix and the list leave out
// before they show "ab" prices, in plain words with the values in force.
import { Link } from 'react-router';
import { constants, GOALS } from '@reiseplaner/domain';
import { Card, Heading, Text } from '@reiseplaner/ui';
import { de } from '../i18n/de';
import { formatScore } from '../lib/format';

const t = de.filterPage;
const pct = (v: number) => Math.round(v * 100);

export function FilterSystem() {
  const flags = constants.RED_FLAG_THRESHOLDS_BY_KIND;
  const floors = GOALS.map((g) => `${de.goals.names[g]}: ${formatScore(constants.GOAL_QUALITY_FLOOR[g])}`).join(' · ');
  const sections: Array<{ id: string; title: string; text: string }> = [
    { id: 'wuensche', title: t.wishesTitle, text: t.wishes },
    { id: 'zimmer', title: t.roomsTitle, text: t.rooms(constants.ROOM_OVERSIZE_EXTRA) },
    {
      id: 'warnsignale',
      title: t.redFlagsTitle,
      text: t.redFlags(
        { guests: flags.hotel.schimmel.guests, share: pct(flags.hotel.schimmel.share) },
        { guests: flags.ferienwohnung.schimmel.guests, share: pct(flags.ferienwohnung.schimmel.share) },
        { guests: flags.hotel.sauberkeit.guests, share: pct(flags.hotel.sauberkeit.share) },
      ),
    },
    { id: 'schwach', title: t.weakTitle, text: t.weak(floors, formatScore(constants.LOW_QUALITY_EXCEPTION_MIN), pct(1 - constants.LOW_QUALITY_EXCEPTION_PRICE_RATIO)) },
    { id: 'sterne', title: t.starTrapTitle, text: t.starTrap(constants.STAR_TRAP_MIN_STARS, pct(1 - constants.STAR_TRAP_PRICE_RATIO), formatScore(constants.STAR_TRAP_MIN_QUALITY)) },
    { id: 'ohne-bewertungen', title: t.unratedTitle, text: t.unrated(pct(1 - constants.UNRATED_MIN_PRICE_RATIO)) },
    { id: 'bleibt', title: t.keptTitle, text: t.kept },
    { id: 'auswahl', title: t.finaleTitle, text: t.finale(constants.FINALISTS_MAX) },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6" data-testid="filter-page">
      <Heading level={1}>{t.title}</Heading>
      <Text>{t.intro}</Text>
      {sections.map((s) => (
        <Card key={s.id} id={s.id} className="space-y-2">
          <Heading level={2}>{s.title}</Heading>
          <Text>{s.text}</Text>
        </Card>
      ))}
      <Text className="text-sm">
        {t.moreBefore}{' '}
        <Link to="/ranking" className="font-medium text-brand-700 hover:underline">
          {de.footer.ranking}
        </Link>
        .
      </Text>
    </div>
  );
}
