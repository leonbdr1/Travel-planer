import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Flow, Mode, StepRecord } from './types';

const modeLabel: Record<Mode, string> = {
  R: 'R – Rundgang (erster Besuch, nur Navigation)',
  P: 'P – Pfad (Nutzerablauf mit Eingaben)',
};

function excerpt(text: string, max = 1800): string {
  const clean = text.replace(/\n{3,}/g, '\n\n').trim();
  return clean.length > max ? `${clean.slice(0, max)}\n… (${clean.length - max} weitere Zeichen)` : clean;
}

export interface RunSummary {
  runId: string;
  mode: Mode;
  flows: Array<{ flow: Flow; steps: StepRecord[]; error: string | null }>;
  baseUrl: string;
  gitSha: string;
  startedAt: string;
}

export function passed(summary: RunSummary): boolean {
  return summary.flows.every(
    (f) => !f.error && f.steps.every((s) => !s.error && s.checks.every((c) => c.ok)),
  );
}

export function writeReport(dir: string, summary: RunSummary): string {
  const lines: string[] = [];
  const allChecks = summary.flows.flatMap((f) => f.steps.flatMap((s) => s.checks));
  const okChecks = allChecks.filter((c) => c.ok).length;
  lines.push(`# Dogfood-Walkthrough ${summary.runId}`, '');
  lines.push(`- Modus: ${modeLabel[summary.mode]}`);
  lines.push(`- Flows: ${summary.flows.map((f) => f.flow.name).join(', ')}`);
  lines.push(`- Basis-URL: ${summary.baseUrl} (echter lokaler Stack, Anbieter im Fake-Modus)`);
  lines.push(`- Stand: ${summary.gitSha}, gestartet ${summary.startedAt}`);
  lines.push(
    `- Ergebnis: ${passed(summary) ? '✅ bestanden' : '❌ nicht bestanden'} (${okChecks}/${allChecks.length} Prüfungen erfüllt)`,
  );
  lines.push('');
  for (const { flow, steps, error } of summary.flows) {
    lines.push(`## Flow „${flow.name}“`, '', flow.description, '');
    if (error) lines.push(`**Abbruch:** ${error}`, '');
    for (const step of steps) {
      const num = String(step.index).padStart(2, '0');
      lines.push(`### ${num} ${step.title}`, '');
      lines.push(`- URL: \`${step.url}\``);
      if (step.screenshot) lines.push(`- Screenshot: ![${step.title}](${step.screenshot})`);
      if (step.error) lines.push(`- **Fehler:** ${step.error}`);
      for (const note of step.notes) lines.push(`- Notiz: ${note}`);
      if (step.checks.length) {
        lines.push('- Prüfungen:');
        for (const check of step.checks) lines.push(`  - [${check.ok ? 'x' : ' '}] ${check.label}`);
      }
      lines.push(`- Überschriften: ${step.headings.length ? step.headings.map((h) => `„${h}“`).join(', ') : 'keine'}`);
      lines.push(
        `- KI-Kennzeichnungen (\`data-ai-provenance\`): ${step.aiLabels.length ? step.aiLabels.map((l) => `„${l}“`).join(', ') : 'keine'}`,
      );
      lines.push(`- Konsolenfehler: ${step.consoleErrors.length ? step.consoleErrors.join(' | ') : 'keine'}`);
      lines.push(`- Fehlgeschlagene Anfragen: ${step.failedRequests.length ? step.failedRequests.join(' | ') : 'keine'}`);
      lines.push('', '<details><summary>Sichtbarer Text</summary>', '', '```text', excerpt(step.bodyText), '```', '', '</details>', '');
    }
  }
  const path = join(dir, 'report.md');
  writeFileSync(path, `${lines.join('\n')}\n`);
  return path;
}
