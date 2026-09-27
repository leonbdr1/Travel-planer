// Skill telemetry (architektur.md 5.7): one row per runner call, hashes only.
import type { Queryable } from '../db';

export interface SkillRunRow {
  skill: string;
  version: string;
  correlationId: string;
  inputHash: string;
  outputHash: string | null;
  latencyMs: number;
  costUsd: number;
  modelUsed: string | null;
  outcome: 'ok' | 'error' | 'fallback' | 'skipped_budget';
  errorMessage: string | null;
  batch: boolean;
}

export async function insertSkillRun(db: Queryable, run: SkillRunRow): Promise<void> {
  await db.query(
    `INSERT INTO app.skill_runs
       (skill, version, correlation_id, input_hash, output_hash, latency_ms, cost_usd, model_used, outcome, error_message, batch)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      run.skill,
      run.version,
      run.correlationId,
      run.inputHash,
      run.outputHash,
      run.latencyMs,
      run.costUsd,
      run.modelUsed,
      run.outcome,
      run.errorMessage === null ? null : run.errorMessage.slice(0, 200),
      run.batch,
    ],
  );
}

export type SkillCostRow = {
  skill: string;
  runs: number;
  ok: number;
  costUsd: number;
};

/** Cost report per skill since `sinceIso` (CLI cost-report, catalog budget check). */
export async function skillCostSince(db: Queryable, sinceIso: string): Promise<SkillCostRow[]> {
  return db.query<SkillCostRow>(
    `SELECT skill, count(*)::int AS runs, count(*) FILTER (WHERE outcome = 'ok')::int AS ok,
            coalesce(sum(cost_usd), 0)::float8 AS "costUsd"
       FROM app.skill_runs WHERE ts >= $1::timestamptz GROUP BY skill ORDER BY skill`,
    [sinceIso],
  );
}
