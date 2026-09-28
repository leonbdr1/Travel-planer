// Praise labels (F17): "Gutes Frühstück", "Besonders sauber" … appear without
// any setting, counted from guest reviews (no AI). The list shows the most
// praised few, detail and finale show all.
import type { PraiseLabelDto } from '@reiseplaner/contracts';
import { Badge } from '@reiseplaner/ui';
import { de } from '../../i18n/de';

export function PraiseLabels({ labels, max }: { labels: readonly PraiseLabelDto[]; max?: number }) {
  const shown = max === undefined ? labels : labels.slice(0, max);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="praise-labels">
      {shown.map((l) => (
        <Badge key={l.topic} tone="brand" title={de.praise.hint} data-testid="praise-label" data-topic={l.topic}>
          {l.label}
        </Badge>
      ))}
    </div>
  );
}
