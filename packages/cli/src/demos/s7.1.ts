// S7.1 demo: keyword stage of the review check on the review fixture
// (reviews_case_1.json): hits per topic with snippet ids, negations, recent
// rating, and the unverified fallback aggregation.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { aggregateUnverified, constants, REVIEW_TOPIC_LABELS, REVIEW_TOPICS, scanReviews, type GuestReview } from '@reiseplaner/domain';
import type { DemoOutput } from '../lib/output';

export async function run(out: DemoOutput): Promise<number> {
  const fixture = JSON.parse(readFileSync(resolve(repoRoot, 'packages/domain/test/fixtures/reviews_case_1.json'), 'utf8')) as {
    today: string;
    reviews: GuestReview[];
  };
  const scan = scanReviews(fixture.reviews, fixture.today);
  out.log(`Stichtag ${fixture.today}: ${fixture.reviews.length} Bewertungen, ${scan.analyzed} ausgewertet (höchstens 24 Monate alt, mit Datum)`);
  out.log(`Letzte 12 Monate: ${scan.recentCount} Bewertungen, Durchschnitt ${scan.recentRating ?? '–'}`);
  out.log('');
  for (const topic of REVIEW_TOPICS) {
    const hits = scan.snippets.filter((s) => s.topicHint === topic);
    if (hits.length === 0) continue;
    out.log(`${REVIEW_TOPIC_LABELS[topic]} (${topic}):`);
    for (const s of hits) out.log(`  ${s.id.padEnd(4)} ${s.date} ${s.lang} ${s.negated ? '[verneint] ' : ''}„${s.text}“ (Stichwort ${s.keyword}, Bewertung ${s.reviewRef})`);
  }
  out.log('');
  out.log('Ohne KI (Fallback, „Hinweis (ungeprüft)“):');
  for (const t of aggregateUnverified(scan.snippets, fixture.today, scan.mentions)) {
    out.log(
      `  ${REVIEW_TOPIC_LABELS[t.topic]}: ${t.unverifiedCount} ${t.unverifiedCount === 1 ? 'Erwähnung' : 'Erwähnungen'}, davon ${t.recentCount} in den letzten 6 Monaten, zuletzt ${t.latestDate}; ${Math.round(t.share * 100)} % der geprüften Bewertungen (die letzten ${constants.MENTION_RECENT_MONTHS} Monate ${constants.MENTION_RECENT_WEIGHT}-fach)`,
    );
  }
  const mold = scan.snippets.filter((s) => s.topicHint === 'schimmel' && !s.negated).length;
  const ok = mold === 3 && scan.snippets.some((s) => s.topicHint === 'schimmel' && s.negated);
  out.log(ok ? '→ drei Schimmel-Treffer, eine Verneinung erkannt' : '→ UNEXPECTED');
  return ok ? 0 : 1;
}
