// Anthropic adapter for the LLM port: official SDK, forced tool use,
// thinking disabled (forced tool choice does not combine with thinking) and
// sampling parameters only for models that accept them.
import Anthropic from '@anthropic-ai/sdk';
import { ProviderError, type ProviderErrorKind } from '../http/errors';
import type { FetchLike } from '../http/request';
import type { LlmBatchItem, LlmBatchOptions, LlmBatchRequest, LlmPort, LlmToolCall, LlmToolResult } from './port';

export interface AnthropicClientOptions {
  apiKey?: string | undefined;
  baseUrl?: string;
  fetch: FetchLike;
  timeoutMs?: number;
  maxRetries?: number;
  onCall?: (endpoint: string) => void;
  sleep?: (ms: number) => Promise<void>;
  /** false for the simulated transport in PROVIDERS_MODE=fake. */
  billed?: boolean;
}

const PROVIDER = 'anthropic';
const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function toParams(call: LlmToolCall): Anthropic.MessageCreateParamsNonStreaming {
  const tool: Anthropic.Tool = {
    name: call.tool.name,
    description: call.tool.description,
    input_schema: call.tool.inputSchema as Anthropic.Tool.InputSchema,
  };
  return {
    model: call.model,
    max_tokens: call.maxTokens,
    system: call.system,
    messages: [{ role: 'user', content: call.user }],
    tools: [tool],
    tool_choice: { type: 'tool', name: call.tool.name },
    thinking: { type: 'disabled' },
    ...(call.temperature === null ? {} : { temperature: call.temperature }),
  };
}

function toResult(message: Anthropic.Message, toolName: string, billed: boolean): LlmToolResult {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === toolName,
  );
  if (!block) {
    throw new ProviderError(PROVIDER, 'bad_response', `no ${toolName} tool call (stop_reason ${message.stop_reason ?? 'null'})`);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ProviderError(PROVIDER, 'bad_response', 'tool call truncated at max_tokens');
  }
  return {
    input: block.input,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    model: message.model,
    stopReason: message.stop_reason,
    billed,
  };
}

function mapError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const kind = (k: ProviderErrorKind, status?: number) =>
    new ProviderError(PROVIDER, k, err instanceof Error ? err.message.slice(0, 200) : 'unknown error', status);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return kind('timeout');
  if (err instanceof Anthropic.APIConnectionError) return kind('network');
  if (err instanceof Anthropic.RateLimitError) return kind('rate_limited', 429);
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === 'number' ? err.status : undefined;
    if (status !== undefined && status >= 500) return kind('server', status);
    return kind('client', status);
  }
  return kind('bad_response');
}

export function createAnthropicClient(options: AnthropicClientOptions): LlmPort {
  const apiKey = options.apiKey;
  const sleep = options.sleep ?? defaultSleep;
  const fetchLike = options.fetch;
  const billed = options.billed ?? true;
  const client = apiKey
    ? new Anthropic({
        apiKey,
        baseURL: options.baseUrl ?? DEFAULT_BASE_URL,
        maxRetries: options.maxRetries ?? 1,
        timeout: options.timeoutMs ?? 20_000,
        fetch: (input, init) =>
          fetchLike(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, init),
      })
    : null;

  function requireClient(): Anthropic {
    if (!client) throw new ProviderError(PROVIDER, 'not_configured', 'ANTHROPIC_API_KEY missing');
    return client;
  }

  return {
    configured: client !== null,

    async callTool(call) {
      const c = requireClient();
      options.onCall?.('messages');
      try {
        const message = await c.messages.create(toParams(call));
        return toResult(message, call.tool.name, billed);
      } catch (err) {
        throw mapError(err);
      }
    },

    async batch(requests: LlmBatchRequest[], batchOptions: LlmBatchOptions = {}): Promise<LlmBatchItem[]> {
      const c = requireClient();
      if (requests.length === 0) return [];
      const toolNames = new Map(requests.map((r) => [r.customId, r.tool.name]));
      try {
        options.onCall?.('batches.create');
        const created = await c.messages.batches.create({
          requests: requests.map((r) => ({ custom_id: r.customId, params: toParams(r) })),
        });
        const pollMs = batchOptions.pollIntervalMs ?? 30_000;
        const deadline = Date.now() + (batchOptions.maxWaitMs ?? 24 * 3600_000);
        let status = created.processing_status;
        while (status !== 'ended') {
          if (Date.now() > deadline) throw new ProviderError(PROVIDER, 'timeout', `batch ${created.id} still ${status}`);
          await sleep(pollMs);
          options.onCall?.('batches.retrieve');
          status = (await c.messages.batches.retrieve(created.id)).processing_status;
          batchOptions.onPoll?.(status);
        }
        options.onCall?.('batches.results');
        const items: LlmBatchItem[] = [];
        for await (const entry of await c.messages.batches.results(created.id)) {
          const toolName = toolNames.get(entry.custom_id) ?? '';
          if (entry.result.type !== 'succeeded') {
            items.push({ customId: entry.custom_id, ok: false, error: entry.result.type });
            continue;
          }
          try {
            items.push({ customId: entry.custom_id, ok: true, result: toResult(entry.result.message, toolName, billed) });
          } catch (err) {
            items.push({ customId: entry.custom_id, ok: false, error: (err as Error).message });
          }
        }
        return items;
      } catch (err) {
        throw mapError(err);
      }
    },
  };
}
