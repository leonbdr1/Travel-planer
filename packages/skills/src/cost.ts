// Cost estimate and settlement from the price table in product.config.yaml.
import { constants } from '@reiseplaner/domain';
import type { LlmUsage } from '@reiseplaner/providers';

export interface ModelPrice {
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  sampling_params: boolean;
}

export interface PriceTable {
  batch_discount: number;
  models: Readonly<Record<string, ModelPrice>>;
}

export function priceFor(table: PriceTable, model: string): ModelPrice {
  const price = table.models[model];
  if (!price) throw new Error(`no price for model ${model} in product.config.yaml ai.models`);
  return price;
}

export function estimateInputTokens(...parts: string[]): number {
  const chars = parts.reduce((sum, p) => sum + p.length, 0);
  return Math.ceil(chars / constants.LLM_CHARS_PER_TOKEN_ESTIMATE) + constants.LLM_TOOL_OVERHEAD_TOKENS;
}

export function costUsd(table: PriceTable, model: string, usage: LlmUsage, batch = false): number {
  const price = priceFor(table, model);
  const raw = (usage.inputTokens * price.input_usd_per_mtok + usage.outputTokens * price.output_usd_per_mtok) / 1_000_000;
  return roundUsd(batch ? raw * table.batch_discount : raw);
}

/** Micro-dollar precision matches skill_runs.cost_usd numeric(12,6). */
export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
