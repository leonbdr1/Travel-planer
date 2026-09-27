// Skill runner (architektur.md 9.1, port of the Frontlift runner):
// bundle table → input check → {{slot}} rendering → cost estimate and cap →
// budget_reserve (fail-closed) → forced tool call → output check with one
// retry → budget_settle with the real tokens → skill_runs row.
// The runner never computes a fallback answer itself; callers own their
// fallback (wish-parse: empty mapping, review-verify: "ungeprüft").
import { constants } from '@reiseplaner/domain';
import { ProviderError, type LlmBatchRequest, type LlmPort, type LlmToolCall, type LlmToolResult } from '@reiseplaner/providers';
import { costUsd, estimateInputTokens, priceFor, roundUsd, type PriceTable } from './cost';
import { getSkill } from './registry';
import { renderTemplate } from './render';
import {
  SkillInputError,
  validatorIssues,
  type SkillBundle,
  type SkillOutcome,
  type SkillRunRecord,
} from './types';

export interface SkillBudget {
  /** Reserve USD from today's llm_usd budget; false (also on errors) means "not allowed". */
  reserve(amountUsd: number): Promise<boolean>;
  settle(reservedUsd: number, actualUsd: number): Promise<void>;
}

export interface SkillTelemetry {
  record(run: SkillRunRecord): Promise<void>;
}

export interface SkillRunnerDeps {
  llm: LlmPort;
  llmEnabled: boolean;
  prices: PriceTable;
  budget: SkillBudget;
  telemetry: SkillTelemetry;
  /** Monotonic milliseconds for latency; defaults to Date.now. */
  clock?: () => number;
  /** Bundle lookup; defaults to the generated table (tests inject their own). */
  bundles?: (id: string) => SkillBundle;
}

export type SkillFailureOutcome = Exclude<SkillOutcome, 'ok'>;

export type SkillRunResult<T> =
  | { ok: true; output: T; costUsd: number; model: string; attempts: number }
  | { ok: false; outcome: SkillFailureOutcome; reason: string; costUsd: number };

export interface RunOptions {
  correlationId: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function prepareCall(bundle: SkillBundle, input: unknown, prices: PriceTable, batch = false) {
  if (!bundle.validateInput(input)) throw new SkillInputError(bundle.manifest.id, validatorIssues(bundle.validateInput));
  const m = bundle.manifest;
  const price = priceFor(prices, m.model);
  const user = renderTemplate(bundle.userTemplate, input as Record<string, unknown>);
  const call: LlmToolCall = {
    model: m.model,
    system: bundle.system,
    user,
    tool: { name: m.tool.name, description: m.tool.description, inputSchema: bundle.outputSchema },
    maxTokens: m.maxTokens,
    temperature: price.sampling_params ? m.temperature : null,
  };
  const inputTokens = estimateInputTokens(bundle.system, user, JSON.stringify(bundle.outputSchema), m.tool.description);
  const estimateUsd = costUsd(prices, m.model, { inputTokens, outputTokens: m.maxTokens }, batch);
  return { call, estimateUsd };
}

/** Billed at the requested model's price; simulated answers cost nothing. */
function billedCost(prices: PriceTable, model: string, result: LlmToolResult, batch: boolean): number {
  return result.billed ? costUsd(prices, model, result.usage, batch) : 0;
}

/** Fail-closed: a throwing budget counts as "not allowed". */
async function tryReserve(budget: SkillBudget, amount: number): Promise<boolean> {
  try {
    return await budget.reserve(roundUsd(amount));
  } catch {
    return false;
  }
}

async function safeRecord(telemetry: SkillTelemetry, run: SkillRunRecord): Promise<void> {
  try {
    await telemetry.record(run);
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'skill_runs insert failed', skill: run.skill, name: (err as Error).name }));
  }
}

async function safeSettle(budget: SkillBudget, reserved: number, actual: number): Promise<void> {
  if (reserved === 0 && actual === 0) return;
  try {
    await budget.settle(roundUsd(reserved), roundUsd(actual));
  } catch (err) {
    // The reservation stays booked: over-counting keeps the brake closed.
    console.error(JSON.stringify({ level: 'error', msg: 'budget_settle failed', name: (err as Error).name }));
  }
}

export async function runSkill<T>(
  deps: SkillRunnerDeps,
  skillId: string,
  input: unknown,
  options: RunOptions,
): Promise<SkillRunResult<T>> {
  const bundle = (deps.bundles ?? getSkill)(skillId);
  const m = bundle.manifest;
  const clock = deps.clock ?? Date.now;
  const started = clock();
  const { call, estimateUsd } = prepareCall(bundle, input, deps.prices);
  const inputHash = await sha256Hex(JSON.stringify(input));

  let reserved = 0;
  let actual = 0;
  let attempts = 0;
  let modelUsed: string | null = null;

  const finish = async (outcome: SkillOutcome, errorMessage: string | null, output: unknown) => {
    await safeSettle(deps.budget, reserved, actual);
    await safeRecord(deps.telemetry, {
      skill: m.id,
      version: m.version,
      correlationId: options.correlationId,
      inputHash,
      outputHash: output === undefined ? null : await sha256Hex(JSON.stringify(output)),
      latencyMs: Math.max(0, Math.round(clock() - started)),
      costUsd: roundUsd(actual),
      modelUsed,
      outcome,
      errorMessage,
      batch: false,
    });
  };
  const fail = async (outcome: SkillFailureOutcome, reason: string): Promise<SkillRunResult<T>> => {
    await finish(outcome, reason, undefined);
    return { ok: false, outcome, reason, costUsd: roundUsd(actual) };
  };

  if (!deps.llmEnabled) return fail('fallback', 'llm_disabled');
  if (estimateUsd > m.costCapUsdPerCall) return fail('fallback', 'cost_cap_exceeded');

  for (let attempt = 0; attempt <= constants.SKILL_OUTPUT_RETRIES; attempt += 1) {
    if (!(await tryReserve(deps.budget, estimateUsd))) {
      return fail(attempt === 0 ? 'skipped_budget' : 'fallback', attempt === 0 ? 'budget_exhausted' : 'invalid_output');
    }
    reserved += estimateUsd;
    attempts += 1;
    let result: LlmToolResult;
    try {
      result = await deps.llm.callTool(call);
    } catch (err) {
      const kind = err instanceof ProviderError ? err.kind : 'unknown';
      return fail('error', `provider_${kind}`);
    }
    modelUsed = result.model;
    actual += billedCost(deps.prices, m.model, result, false);
    if (bundle.validateOutput(result.input)) {
      await finish('ok', null, result.input);
      return { ok: true, output: result.input as T, costUsd: roundUsd(actual), model: result.model, attempts };
    }
  }
  return fail('fallback', 'invalid_output');
}

export interface BatchInput {
  customId: string;
  input: unknown;
}

export type BatchItemResult<T> =
  | { customId: string; ok: true; output: T; costUsd: number }
  | { customId: string; ok: false; reason: string };

export interface BatchRunResult<T> {
  items: BatchItemResult<T>[];
  costUsd: number;
  estimateUsd: number;
}

/**
 * Message Batches API run (CLI only, catalog skills): one reservation for the
 * whole batch, per-item validation, invalid items retried once synchronously.
 */
export async function runSkillBatch<T>(
  deps: SkillRunnerDeps,
  skillId: string,
  inputs: BatchInput[],
  options: RunOptions & { pollIntervalMs?: number; onPoll?: (status: string) => void },
): Promise<BatchRunResult<T>> {
  const bundle = (deps.bundles ?? getSkill)(skillId);
  const m = bundle.manifest;
  const clock = deps.clock ?? Date.now;
  const prepared = inputs.map((i) => ({ ...i, ...prepareCall(bundle, i.input, deps.prices, true) }));
  const estimateUsd = roundUsd(prepared.reduce((s, p) => s + p.estimateUsd, 0));
  const overCap = prepared.find((p) => p.estimateUsd > m.costCapUsdPerCall);
  if (!deps.llmEnabled) throw new Error('LLM_ENABLED=false: catalog generation needs the model');
  if (overCap) throw new Error(`${overCap.customId}: estimate ${overCap.estimateUsd} $ exceeds costCapUsdPerCall ${m.costCapUsdPerCall} $`);
  if (!(await tryReserve(deps.budget, estimateUsd))) throw new Error(`llm_usd budget refused ${estimateUsd} $`);

  const started = clock();
  let actual = 0;
  const requests: LlmBatchRequest[] = prepared.map((p) => ({ ...p.call, customId: p.customId }));
  let batchItems;
  try {
    batchItems = await deps.llm.batch(requests, {
      pollIntervalMs: options.pollIntervalMs ?? constants.LLM_BATCH_POLL_INTERVAL_MS,
      ...(options.onPoll ? { onPoll: options.onPoll } : {}),
    });
  } catch (err) {
    await safeSettle(deps.budget, estimateUsd, 0);
    throw err;
  }
  const byId = new Map(batchItems.map((b) => [b.customId, b]));
  const items: BatchItemResult<T>[] = [];
  let extraReserved = 0;
  for (const p of prepared) {
    const inputHash = await sha256Hex(JSON.stringify(p.input));
    const entry = byId.get(p.customId);
    let output: unknown;
    let cost = 0;
    let model: string | null = null;
    let reason: string | null = entry ? (entry.ok ? null : entry.error) : 'missing_result';
    if (entry?.ok) {
      model = entry.result.model;
      cost += billedCost(deps.prices, m.model, entry.result, true);
      if (bundle.validateOutput(entry.result.input)) output = entry.result.input;
      else reason = 'invalid_output';
    }
    if (output === undefined) {
      // One synchronous retry at full price, reserved separately.
      const retryEstimate = prepareCall(bundle, p.input, deps.prices).estimateUsd;
      if (await tryReserve(deps.budget, retryEstimate)) {
        extraReserved += retryEstimate;
        try {
          const retry = await deps.llm.callTool(p.call);
          model = retry.model;
          cost += billedCost(deps.prices, m.model, retry, false);
          if (bundle.validateOutput(retry.input)) {
            output = retry.input;
            reason = null;
          } else reason = 'invalid_output';
        } catch (err) {
          reason = `provider_${err instanceof ProviderError ? err.kind : 'unknown'}`;
        }
      } else reason = 'budget_exhausted';
    }
    actual += cost;
    await safeRecord(deps.telemetry, {
      skill: m.id,
      version: m.version,
      correlationId: `${options.correlationId}:${p.customId}`,
      inputHash,
      outputHash: output === undefined ? null : await sha256Hex(JSON.stringify(output)),
      latencyMs: Math.max(0, Math.round(clock() - started)),
      costUsd: roundUsd(cost),
      modelUsed: model,
      outcome: output === undefined ? 'error' : 'ok',
      errorMessage: output === undefined ? reason : null,
      batch: true,
    });
    items.push(
      output === undefined
        ? { customId: p.customId, ok: false, reason: reason ?? 'unknown' }
        : { customId: p.customId, ok: true, output: output as T, costUsd: roundUsd(cost) },
    );
  }
  await safeSettle(deps.budget, estimateUsd + extraReserved, actual);
  return { items, costUsd: roundUsd(actual), estimateUsd };
}
