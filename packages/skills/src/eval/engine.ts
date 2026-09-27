// Eval engine (port of frontlift/core/eval, architektur.md 9.1): runs every
// dataset case through the real runner, checks deterministic JSONPath
// assertions, asks the LLM judge for rubrics (skipped with --fake), compares
// the score with baseline.json (tolerance SKILL_EVAL_REGRESSION_TOLERANCE)
// and stops at the per-skill budget (SKILL_EVAL_BUDGET_USD).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { constants } from '@reiseplaner/domain';
import type { LlmPort } from '@reiseplaner/providers';
import { roundUsd, type PriceTable } from '../cost';
import { memorySkillHooks } from '../hooks';
import type { RawBundle } from '../load';
import { prepareCall, runSkill } from '../runner';
import type { SkillBundle } from '../types';
import { checkAssertion, evalCaseSchema, type EvalCase } from './assertions';
import type { Judge } from './judge';

export interface Baseline {
  score: number | null;
  n: number;
  updatedAt: string | null;
}

export interface CaseResult {
  id: string;
  status: 'pass' | 'fail' | 'error' | 'skipped';
  failures: string[];
  costUsd: number;
}

export interface EvalReport {
  skill: string;
  version: string;
  model: string;
  mode: 'fake' | 'real';
  generatedAt: string;
  score: number | null;
  counted: number;
  passed: number;
  failed: number;
  errored: number;
  skipped: number;
  costUsd: number;
  budgetUsd: number;
  aborted: boolean;
  target: number;
  baseline: Baseline;
  tolerance: number;
  regression: boolean | null;
  cases: CaseResult[];
}

export interface EvalOptions {
  bundle: RawBundle;
  compiled: SkillBundle;
  llm: LlmPort;
  prices: PriceTable;
  fake: boolean;
  judge?: Judge;
  now: () => Date;
}

export function loadDataset(bundleDir: string): EvalCase[] {
  const lines = readFileSync(join(bundleDir, 'evals/dataset.jsonl'), 'utf8').split('\n');
  const cases: EvalCase[] = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const parsed = evalCaseSchema.safeParse(JSON.parse(line));
    if (!parsed.success) throw new Error(`dataset.jsonl line ${i + 1}: ${parsed.error.issues.map((x) => x.message).join('; ')}`);
    cases.push(parsed.data);
  });
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) throw new Error(`dataset.jsonl: duplicate case id ${c.id}`);
    ids.add(c.id);
  }
  return cases;
}

export function loadBaseline(bundleDir: string): Baseline {
  return JSON.parse(readFileSync(join(bundleDir, 'baseline.json'), 'utf8')) as Baseline;
}

export async function runEval(options: EvalOptions): Promise<EvalReport> {
  const { bundle, compiled, prices } = options;
  const cases = loadDataset(bundle.dir);
  const baseline = loadBaseline(bundle.dir);
  const budgetUsd = constants.SKILL_EVAL_BUDGET_USD;
  const hooks = memorySkillHooks(budgetUsd);
  const results: CaseResult[] = [];
  let judgeCost = 0;
  let aborted = false;

  for (const c of cases) {
    const assertions = c.assertions ?? [];
    const needsJudge = c.judgeRubric !== undefined && !options.fake;
    if (assertions.length === 0 && !needsJudge) {
      results.push({ id: c.id, status: 'skipped', failures: ['nur Judge-Rubrik (im Fake-Modus übersprungen)'], costUsd: 0 });
      continue;
    }
    const nextEstimate = prepareCall(compiled, c.input, prices).estimateUsd;
    if (hooks.spentUsd() + judgeCost + nextEstimate > budgetUsd) {
      aborted = true;
      results.push({ id: c.id, status: 'skipped', failures: ['Eval-Budget erreicht'], costUsd: 0 });
      continue;
    }
    const run = await runSkill(
      { llm: options.llm, llmEnabled: true, prices, budget: hooks.budget, telemetry: hooks.telemetry, bundles: () => compiled },
      compiled.manifest.id,
      c.input,
      { correlationId: `eval:${c.id}` },
    );
    if (!run.ok) {
      results.push({ id: c.id, status: 'error', failures: [`Runner: ${run.outcome} (${run.reason})`], costUsd: run.costUsd });
      continue;
    }
    const failures = assertions.map((a) => checkAssertion(run.output, a)).filter((f): f is string => f !== null);
    let cost = run.costUsd;
    if (needsJudge && options.judge && c.judgeRubric) {
      const verdict = await options.judge({ rubric: c.judgeRubric, input: c.input, output: run.output, expected: c.expected });
      judgeCost += verdict.costUsd;
      cost += verdict.costUsd;
      if (!verdict.pass) failures.push(`Judge: ${verdict.reason}`);
    }
    results.push({ id: c.id, status: failures.length === 0 ? 'pass' : 'fail', failures, costUsd: roundUsd(cost) });
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const errored = results.filter((r) => r.status === 'error').length;
  const counted = passed + failed + errored;
  const score = counted === 0 ? null : Math.round((passed / counted) * 1000) / 1000;
  const tolerance = constants.SKILL_EVAL_REGRESSION_TOLERANCE;
  const regression =
    options.fake || score === null || baseline.score === null ? null : score < baseline.score - tolerance;
  return {
    skill: compiled.manifest.id,
    version: compiled.manifest.version,
    model: compiled.manifest.model,
    mode: options.fake ? 'fake' : 'real',
    generatedAt: options.now().toISOString(),
    score,
    counted,
    passed,
    failed,
    errored,
    skipped: results.length - counted,
    costUsd: roundUsd(hooks.spentUsd() + judgeCost),
    budgetUsd,
    aborted,
    target: constants.SKILL_EVAL_TARGET_SCORE,
    baseline,
    tolerance,
    regression,
    cases: results,
  };
}
