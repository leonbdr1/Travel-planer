// Review check panel (F8, filled in M7): warnings with topic, count and
// recency, labelled as AI-assisted analysis.
import type { ReviewCheckDto } from '@reiseplaner/contracts';
import { AiLabel, Card, Heading, Text } from '@reiseplaner/ui';
import { de } from '../../i18n/de';

export function ReviewCheckPanel({ check, aiLabel }: { check: ReviewCheckDto | null; aiLabel: string }) {
  const t = de.reviewCheck;
  return (
    <Card className="space-y-3" data-testid="review-check">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={2}>{t.title}</Heading>
        {check ? <AiLabel text={aiLabel} /> : null}
      </div>
      {!check ? <Text className="text-sm">{t.notChecked}</Text> : null}
      {check && check.warnings.length === 0 ? <Text className="text-sm">{t.noIssues(check.reviews_checked)}</Text> : null}
      {check && check.warnings.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {check.warnings.map((w) => (
            <li key={w.topic} data-testid="warning">
              <span className="font-semibold text-zinc-900">{w.label}:</span> {t.mentions(w.count, w.recent_count)}
              {w.verified ? '' : ` (${t.unverified})`}
            </li>
          ))}
        </ul>
      ) : null}
      {check && check.status === 'skipped_budget' ? <Text className="text-xs text-zinc-500">{t.skipped}</Text> : null}
    </Card>
  );
}
