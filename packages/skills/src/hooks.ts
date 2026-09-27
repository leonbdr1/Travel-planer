// Budget and telemetry hooks for the runner: database-backed for the Worker
// and CLI (app.budget_reserve/settle, app.skill_runs), in-memory for evals.
import { budgetReserve, budgetSettle, insertSkillRun, type Queryable } from '@reiseplaner/db';
import type { SkillBudget, SkillTelemetry } from './runner';
import type { SkillRunRecord } from './types';

export function dbSkillHooks(db: Queryable, dailyBudgetUsd: number): { budget: SkillBudget; telemetry: SkillTelemetry } {
  return {
    budget: {
      reserve: (amount) => budgetReserve(db, 'llm_usd', amount, dailyBudgetUsd),
      settle: (reserved, actual) => budgetSettle(db, 'llm_usd', reserved, actual),
    },
    telemetry: { record: (run) => insertSkillRun(db, run) },
  };
}

export interface MemoryHooks {
  budget: SkillBudget;
  telemetry: SkillTelemetry;
  runs: SkillRunRecord[];
  spentUsd(): number;
}

/** In-memory hooks with a hard cap (eval runs: SKILL_EVAL_BUDGET_USD per skill). */
export function memorySkillHooks(capUsd: number): MemoryHooks {
  let reserved = 0;
  let settled = 0;
  const runs: SkillRunRecord[] = [];
  return {
    runs,
    spentUsd: () => settled,
    budget: {
      async reserve(amount) {
        if (reserved + settled + amount > capUsd) return false;
        reserved += amount;
        return true;
      },
      async settle(res, actual) {
        reserved = Math.max(0, reserved - res);
        settled += actual;
      },
    },
    telemetry: {
      async record(run) {
        runs.push(run);
      },
    },
  };
}
