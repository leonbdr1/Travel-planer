// Operational alert to the ops address (look-to-book watch, budgets).
import { z } from 'zod';
import { escapeHtml, layout, type RenderedEmail } from './layout';

export const opsAlertPayload = z.object({
  title: z.string(),
  severity: z.enum(['warning', 'critical', 'resolved']),
  lines: z.array(z.string()),
});
export type OpsAlertPayload = z.infer<typeof opsAlertPayload>;

const PREFIX = { warning: 'Warnung', critical: 'Kritisch', resolved: 'Wieder in Ordnung' } as const;

export function renderOpsAlert(p: OpsAlertPayload): RenderedEmail {
  return layout(
    p.title,
    `<ul>${p.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
    p.lines.map((l) => `- ${l}`).join('\n'),
    `[${PREFIX[p.severity]}] ${p.title}`,
  );
}
