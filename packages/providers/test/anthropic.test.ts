import { describe, expect, it } from 'vitest';
import { createFakeAnthropicFetch } from '../src/fake/anthropic-fetch';
import { ProviderError } from '../src/http/errors';
import { createAnthropicClient } from '../src/llm/anthropic';
import type { LlmToolCall } from '../src/llm/port';

const call = (overrides: Partial<LlmToolCall> = {}): LlmToolCall => ({
  model: 'claude-haiku-4-5-20251001',
  system: 'Du ordnest zu.',
  user: '<wunsch>ruhig</wunsch>',
  tool: { name: 'submit_x', description: 'Ergebnis', inputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
  maxTokens: 100,
  temperature: 0,
  ...overrides,
});

const responders = { submit_x: ({ user }: { user: string }) => ({ ok: user.includes('ruhig') }) };

describe('anthropic adapter (simulated transport)', () => {
  it('forces the output tool and returns its arguments with usage', async () => {
    const calls: string[] = [];
    const llm = createAnthropicClient({
      apiKey: 'test-key',
      fetch: createFakeAnthropicFetch({ responders }),
      onCall: (e) => calls.push(e),
      billed: false,
    });
    const result = await llm.callTool(call());
    expect(result.input).toEqual({ ok: true });
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result).toMatchObject({ model: 'claude-haiku-4-5-20251001', stopReason: 'tool_use', billed: false });
    expect(calls).toEqual(['messages']);
  });

  it('mirrors the API: sampling parameters are rejected for models without them', async () => {
    const llm = createAnthropicClient({
      apiKey: 'k',
      maxRetries: 0,
      fetch: createFakeAnthropicFetch({ responders, noSamplingModels: ['claude-sonnet-5'] }),
    });
    await expect(llm.callTool(call({ model: 'claude-sonnet-5', temperature: 0 }))).rejects.toMatchObject({ kind: 'client', status: 400 });
    await expect(llm.callTool(call({ model: 'claude-sonnet-5', temperature: null }))).resolves.toMatchObject({ input: { ok: true } });
  });

  it('maps HTTP failures to provider error kinds', async () => {
    for (const [status, kind] of [
      [429, 'rate_limited'],
      [500, 'server'],
      [529, 'server'],
    ] as const) {
      const llm = createAnthropicClient({
        apiKey: 'k',
        maxRetries: 0,
        fetch: createFakeAnthropicFetch({ responders, failNext: { remaining: 1, status } }),
      });
      await expect(llm.callTool(call())).rejects.toMatchObject({ name: 'ProviderError', kind });
    }
  });

  it('reports a missing tool call as bad_response and a missing key as not_configured', async () => {
    const llm = createAnthropicClient({ apiKey: 'k', maxRetries: 0, fetch: createFakeAnthropicFetch({ responders: {} }) });
    await expect(llm.callTool(call())).rejects.toMatchObject({ kind: 'client' });
    const unconfigured = createAnthropicClient({ fetch: createFakeAnthropicFetch({ responders }) });
    expect(unconfigured.configured).toBe(false);
    await expect(unconfigured.callTool(call())).rejects.toBeInstanceOf(ProviderError);
    await expect(unconfigured.callTool(call())).rejects.toMatchObject({ kind: 'not_configured' });
  });

  it('runs a Message Batch end to end', async () => {
    const llm = createAnthropicClient({ apiKey: 'k', fetch: createFakeAnthropicFetch({ responders }), sleep: async () => undefined });
    const items = await llm.batch(
      [
        { ...call(), customId: 'a' },
        { ...call({ user: '<wunsch>laut</wunsch>' }), customId: 'b' },
      ],
      { pollIntervalMs: 1 },
    );
    expect(items.map((i) => (i.ok ? [i.customId, i.result.input] : [i.customId, i.error]))).toEqual([
      ['a', { ok: true }],
      ['b', { ok: false }],
    ]);
  });
});
