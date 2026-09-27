import { productConfig } from '@reiseplaner/config';
import type { LlmPort, LlmToolCall } from '@reiseplaner/providers';
import { describe, expect, it } from 'vitest';
import { getSkill } from '../src/registry';
import { runSkill, runSkillBatch } from '../src/runner';
import { SkillInputError } from '../src/types';
import { fakeLlm, runnerDeps } from './helpers';

const wish = (text: string) => ({ text });

describe('runSkill', () => {
  it('runs wish-parse through the simulated model and records telemetry', async () => {
    const { deps, hooks } = runnerDeps();
    const result = await runSkill<{ chips: string[]; unmatched: string[] }>(
      deps,
      'reiseplaner.wish-parse',
      wish('sauber, ruhig und Blick auf den See'),
      { correlationId: 'test-1' },
    );
    expect(result).toMatchObject({ ok: true, costUsd: 0, attempts: 1 });
    if (!result.ok) throw new Error('expected ok');
    expect(result.output.chips).toEqual(['sauber', 'ruhig']);
    expect(result.output.unmatched).toEqual(['Blick auf den See']);
    expect(hooks.runs).toHaveLength(1);
    const run = hooks.runs[0];
    expect(run).toMatchObject({ skill: 'reiseplaner.wish-parse', version: '1.0.0', outcome: 'ok', batch: false, costUsd: 0 });
    expect(run?.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(run?.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(run)).not.toContain('Blick auf den See');
    expect(hooks.spentUsd()).toBe(0);
  });

  it('falls back without calling the model when LLM_ENABLED is false', async () => {
    let calls = 0;
    const llm = fakeLlm();
    const counting: LlmPort = { ...llm, callTool: (c) => ((calls += 1), llm.callTool(c)) };
    const { deps, hooks } = runnerDeps({ llmEnabled: false, llm: counting });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'fallback', reason: 'llm_disabled' });
    expect(calls).toBe(0);
    expect(hooks.runs[0]?.outcome).toBe('fallback');
  });

  it('skips when the budget refuses the reservation (fail-closed)', async () => {
    const { deps, hooks } = runnerDeps({}, 0.0001);
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'skipped_budget', reason: 'budget_exhausted' });
    expect(hooks.runs[0]?.outcome).toBe('skipped_budget');
  });

  it('treats a throwing budget as "not allowed"', async () => {
    const { deps } = runnerDeps({
      budget: {
        reserve: async () => {
          throw new Error('db down');
        },
        settle: async () => undefined,
      },
    });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'skipped_budget' });
  });

  it('retries once on schema-violating output', async () => {
    const { deps, hooks } = runnerDeps({ llm: fakeLlm({ llmInvalidNext: { remaining: 1 } }) });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(hooks.runs).toHaveLength(1);
  });

  it('falls back after two invalid outputs', async () => {
    const { deps, hooks } = runnerDeps({ llm: fakeLlm({ llmInvalidNext: { remaining: 2 } }) });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'fallback', reason: 'invalid_output' });
    expect(hooks.runs[0]?.outcome).toBe('fallback');
  });

  it('maps provider failures to outcome error', async () => {
    const { deps } = runnerDeps({ llm: fakeLlm({ llmFailNext: { remaining: 1, status: 500 } }) });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'error', reason: 'provider_server' });
  });

  it('refuses calls whose estimate exceeds the cost cap', async () => {
    const real = getSkill('reiseplaner.wish-parse');
    const tiny = { ...real, manifest: { ...real.manifest, costCapUsdPerCall: 0.0001 } };
    const { deps } = runnerDeps({ bundles: () => tiny });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    expect(result).toMatchObject({ ok: false, outcome: 'fallback', reason: 'cost_cap_exceeded' });
  });

  it('rejects invalid input before any model call', async () => {
    const { deps } = runnerDeps();
    await expect(runSkill(deps, 'reiseplaner.wish-parse', { text: '' }, { correlationId: 't' })).rejects.toBeInstanceOf(
      SkillInputError,
    );
    await expect(
      runSkill(deps, 'reiseplaner.wish-parse', { text: 'x'.repeat(301) }, { correlationId: 't' }),
    ).rejects.toBeInstanceOf(SkillInputError);
  });

  it('omits temperature for Sonnet 5 and sends 0 for Haiku', async () => {
    const seen: LlmToolCall[] = [];
    const llm = fakeLlm();
    const spy: LlmPort = { ...llm, callTool: (c) => (seen.push(c), llm.callTool(c)) };
    const { deps } = runnerDeps({ llm: spy });
    const places = await runSkill(
      deps,
      'reiseplaner.catalog-places',
      { region: { name: 'Allgäu', countryCode: 'DE' }, themes: ['wandern'] },
      { correlationId: 't' },
    );
    expect(places.ok).toBe(true);
    await runSkill(deps, 'reiseplaner.wish-parse', wish('ruhig'), { correlationId: 't' });
    expect(seen.map((c) => [c.model, c.temperature])).toEqual([
      ['claude-sonnet-5', null],
      ['claude-haiku-4-5-20251001', 0],
    ]);
  });

  it('settles billed calls at list price', async () => {
    const billed: LlmPort = {
      configured: true,
      callTool: async () => ({
        input: { chips: ['sauber'], themes: [], review_topics: [], unmatched: [] },
        usage: { inputTokens: 1000, outputTokens: 100 },
        model: 'claude-haiku-4-5-20251001',
        stopReason: 'tool_use',
        billed: true,
      }),
      batch: async () => [],
    };
    const { deps, hooks } = runnerDeps({ llm: billed });
    const result = await runSkill(deps, 'reiseplaner.wish-parse', wish('sauber'), { correlationId: 't' });
    const price = productConfig.ai.models['claude-haiku-4-5-20251001'];
    const expected = (1000 * (price?.input_usd_per_mtok ?? 0) + 100 * (price?.output_usd_per_mtok ?? 0)) / 1e6;
    expect(result).toMatchObject({ ok: true, costUsd: expected });
    expect(hooks.spentUsd()).toBeCloseTo(expected, 9);
    expect(hooks.runs[0]?.costUsd).toBe(expected);
  });
});

describe('runSkillBatch', () => {
  it('runs catalog regions through the simulated Batches API', async () => {
    const { deps, hooks } = runnerDeps();
    const polls: string[] = [];
    const result = await runSkillBatch<{ regions: Array<{ name: string }> }>(
      deps,
      'reiseplaner.catalog-regions',
      [
        { customId: 'de', input: { countryCode: 'DE', themes: ['wandern'] } },
        { customId: 'at', input: { countryCode: 'AT', themes: ['seen'] } },
      ],
      { correlationId: 'batch-1', pollIntervalMs: 1, onPoll: (s) => polls.push(s) },
    );
    expect(result.items.map((i) => [i.customId, i.ok])).toEqual([
      ['de', true],
      ['at', true],
    ]);
    const de = result.items[0];
    if (!de?.ok) throw new Error('expected ok');
    expect(de.output.regions.map((r) => r.name)).toContain('Allgäu');
    expect(polls.at(-1)).toBe('ended');
    expect(hooks.runs.map((r) => [r.correlationId, r.batch, r.outcome])).toEqual([
      ['batch-1:de', true, 'ok'],
      ['batch-1:at', true, 'ok'],
    ]);
    expect(result.estimateUsd).toBeGreaterThan(0);
    expect(hooks.spentUsd()).toBe(0);
  });

  it('retries invalid batch items synchronously', async () => {
    const { deps, hooks } = runnerDeps({ llm: fakeLlm({ llmInvalidNext: { remaining: 1 } }) });
    const result = await runSkillBatch(
      deps,
      'reiseplaner.catalog-regions',
      [{ customId: 'ch', input: { countryCode: 'CH', themes: ['wandern'] } }],
      { correlationId: 'b', pollIntervalMs: 1 },
    );
    expect(result.items[0]?.ok).toBe(true);
    expect(hooks.runs[0]?.outcome).toBe('ok');
  });
});
