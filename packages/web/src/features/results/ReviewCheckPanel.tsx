// Review check panel (F8, F17): warnings with topic, number of mentions, how
// many of them are recent, the latest date and severity. Confirmed warnings
// are labelled as AI-assisted analysis; keyword hits without AI verification
// are shown as unverified hints and never reduce the score. Below, what
// guests praise: the labels and the counts behind them (no AI).
import type { ReviewCheckDto } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { AiLabel, Card, Heading, Text, cx } from '@reiseplaner/ui';
import { de } from '../../i18n/de';
import { formatDate, formatDateTime } from '../../lib/format';
import { PraiseLabels } from './PraiseLabels';

const t = de.reviewCheck;

export function ReviewCheckPanel({ check, aiLabel }: { check: ReviewCheckDto | null; aiLabel: string }) {
  return (
    <Card className="space-y-3" data-testid="review-check">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={2}>{t.title}</Heading>
        {check?.ai_assisted ? <AiLabel text={aiLabel} /> : null}
      </div>
      {!check ? <Text className="text-sm">{t.notChecked(constants.REVIEW_TOP_N)}</Text> : null}
      {check?.status === 'no_reviews' ? <Text className="text-sm">{t.noReviews}</Text> : null}
      {check?.status === 'failed' ? <Text className="text-sm">{t.failed}</Text> : null}
      {check && (check.status === 'ok' || check.status === 'skipped_budget') && check.warnings.length === 0 ? (
        <Text className="text-sm" data-testid="review-no-issues">
          {t.noIssues(check.reviews_checked)}
        </Text>
      ) : null}
      {check && check.warnings.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {check.warnings.map((w) => (
            <li
              key={w.topic}
              data-testid="warning"
              data-verified={w.verified}
              className={cx('rounded-md px-3 py-2', w.verified ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-zinc-50 ring-1 ring-zinc-200')}
            >
              <span className="font-semibold text-zinc-900">{w.label}:</span> {t.mentions(w.count, w.recent_count, constants.REVIEW_RECENT_MONTHS_LABEL)}
              <span className="block text-xs text-zinc-600">
                {[w.latest_date ? t.latest(formatDate(w.latest_date)) : null, w.verified && w.severity ? t.severity[w.severity] : t.unverified]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {check && check.praise.some((p) => p.praised > 0) ? (
        <div className="space-y-2 border-t border-zinc-100 pt-3" data-testid="praise">
          <Heading level={3}>{t.praiseTitle}</Heading>
          <PraiseLabels labels={check.labels} />
          <ul className="space-y-0.5 text-sm text-zinc-700">
            {/* Topics nobody praised would only be noise here; complaints are the warnings above. */}
            {check.praise.filter((p) => p.praised > 0).map((p) => (
              <li key={p.topic} data-testid="praise-count" data-topic={p.topic}>
                {t.praiseCount(p.label, p.praised, p.criticized)}
              </li>
            ))}
          </ul>
          <Text className="text-xs text-zinc-500">
            {t.praiseNote(constants.PRAISE_MIN_MENTIONS, Math.round(constants.PRAISE_MIN_SHARE * 100), constants.PRAISE_MAX_AGE_MONTHS)}
          </Text>
        </div>
      ) : null}
      {check && check.status !== 'no_reviews' ? (
        <Text className="text-xs text-zinc-500">{t.checkedCount(check.reviews_checked, formatDateTime(check.checked_at))}</Text>
      ) : null}
      {check?.status === 'skipped_budget' ? <Text className="text-xs text-zinc-500">{t.skipped}</Text> : null}
    </Card>
  );
}
