// `npm run cli -- cost-report [--days 7] [--out <file>]`: provider calls,
// AI costs (skill_runs), daily budgets and the look-to-book ratio of the
// last days as a Markdown report (architektur.md 14, S9.2).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lookToBookRatio, type Queryable } from '@reiseplaner/db';
import { repoRoot } from '@reiseplaner/db/node';
import { flag } from '../lib/args';
import { openCliDb } from '../lib/db';

export async function costReport(db: Queryable, days: number, now: Date): Promise<string> {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const usage = await db.query<{ provider: string; endpoint: string; calls: number }>(
    `SELECT provider, endpoint, sum(calls)::int AS calls FROM app.provider_usage WHERE day > $1::date GROUP BY provider, endpoint ORDER BY provider, endpoint`,
    [since],
  );
  const skills = await db.query<{ skill: string; runs: number; ok: number; cost: number }>(
    `SELECT skill, count(*)::int AS runs, count(*) FILTER (WHERE outcome = 'ok')::int AS ok, coalesce(sum(cost_usd), 0)::float8 AS cost
       FROM app.skill_runs WHERE ts > $1::date GROUP BY skill ORDER BY skill`,
    [since],
  );
  const budgets = await db.query<{ day: string; scope: string; used: number; cap: number }>(
    `SELECT day::text AS day, scope, (reserved + settled)::float8 AS used, cap::float8 AS cap FROM app.budget_ledger WHERE day > $1::date ORDER BY day, scope`,
    [since],
  );
  const bookings = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM app.bookings WHERE confirmed_at > $1::date", [since]);
  const ratio = await lookToBookRatio(db, days);
  const lines = [
    `# Kostenbericht: letzte ${days} Tage (ab ${since})`,
    '',
    '## Anbieteraufrufe',
    '',
    '| Anbieter | Endpunkt | Aufrufe |',
    '|---|---|---|',
    ...(usage.length ? usage.map((u) => `| ${u.provider} | ${u.endpoint} | ${u.calls} |`) : ['| – | – | 0 |']),
    '',
    '## KI-Kosten (skill_runs)',
    '',
    '| Skill | Läufe | davon ok | Kosten USD |',
    '|---|---|---|---|',
    ...(skills.length ? skills.map((s) => `| ${s.skill} | ${s.runs} | ${s.ok} | ${Number(s.cost).toFixed(4)} |`) : ['| – | 0 | 0 | 0.0000 |']),
    '',
    '## Tagesbudgets',
    '',
    '| Tag | Bereich | verbraucht | Deckel | Anteil |',
    '|---|---|---|---|---|',
    ...(budgets.length ? budgets.map((b) => `| ${b.day} | ${b.scope} | ${b.used} | ${b.cap} | ${b.cap > 0 ? Math.round((b.used / b.cap) * 100) : 0} % |`) : ['| – | – | 0 | – | – |']),
    '',
    '## Such-zu-Buchungs-Verhältnis',
    '',
    `${Math.round(ratio)} : 1 (Tarifanfragen je bestätigter Buchung; ${bookings[0]?.n ?? 0} Buchungen im Zeitraum).`,
    '',
  ];
  return lines.join('\n');
}

export async function costReportCommand(args: string[], log: (line: string) => void): Promise<number> {
  const days = Number(flag(args, 'days') ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    log('usage: cost-report [--days 1..90] [--out <file>]');
    return 2;
  }
  const { db } = await openCliDb();
  try {
    const report = await costReport(db, days, new Date());
    const out = flag(args, 'out');
    if (out) writeFileSync(resolve(repoRoot, out), report);
    for (const line of report.split('\n')) log(line);
    return 0;
  } finally {
    await db.close();
  }
}
