// Fail-closed cost brakes (architektur.md 0.4, 5.7): every paid or quota'd
// call reserves budget first; any database error counts as "not allowed".
import type { Queryable } from '../db';

export type BudgetScope = 'llm_usd' | 'liteapi_calls' | 'ors_calls' | 'rating_calls' | 'searches';

export async function budgetReserve(db: Queryable, scope: BudgetScope, amount: number, cap: number): Promise<boolean> {
  try {
    const rows = await db.query<{ ok: boolean }>('SELECT app.budget_reserve($1, $2, $3) AS ok', [scope, amount, cap]);
    return rows[0]?.ok === true;
  } catch {
    return false;
  }
}

export async function budgetSettle(db: Queryable, scope: BudgetScope, reserved: number, actual: number): Promise<void> {
  await db.query('SELECT app.budget_settle($1, $2, $3)', [scope, reserved, actual]);
}

export interface BudgetStatus {
  scope: BudgetScope;
  reserved: number;
  settled: number;
  cap: number;
}

export async function budgetStatus(db: Queryable, day: string): Promise<BudgetStatus[]> {
  const rows = await db.query<{ scope: BudgetScope; reserved: number; settled: number; cap: number }>(
    `SELECT scope, reserved::float8 AS reserved, settled::float8 AS settled, cap::float8 AS cap
       FROM app.budget_ledger WHERE day = $1 ORDER BY scope`,
    [day],
  );
  return rows;
}

export interface RateLimitResult {
  count: number;
  allowed: boolean;
  /** true when the RPC failed; the call is then refused (fail-closed). */
  failed?: true;
}

/** Atomic counter; errors mean "not allowed" (fail-closed). */
export async function incrementRateLimit(db: Queryable, key: string, max: number, windowS: number): Promise<RateLimitResult> {
  try {
    const rows = await db.query<{ count: number; allowed: boolean }>(
      'SELECT count, allowed FROM app.increment_rate_limit($1, $2, $3)',
      [key, max, windowS],
    );
    const row = rows[0];
    return row ? { count: Number(row.count), allowed: row.allowed === true } : { count: 0, allowed: false, failed: true };
  } catch {
    return { count: 0, allowed: false, failed: true };
  }
}
