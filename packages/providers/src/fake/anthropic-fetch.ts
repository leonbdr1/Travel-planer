// Simulated Anthropic Messages API (and Message Batches API) for PROVIDERS_MODE
// = fake. The real SDK talks to this fetch, so request building, tool-call
// extraction and error mapping run unchanged. Answers come from responders
// registered per tool name: deterministic "fake models" that see exactly the
// rendered prompt a real model would see (packages/skills/src/fake).
import type { FetchLike } from '../http/request';
import { hashString } from './random';

export interface FakeLlmRequest {
  model: string;
  system: string;
  user: string;
  toolName: string;
}

export type FakeLlmResponder = (request: FakeLlmRequest) => unknown;

export interface FakeAnthropicOptions {
  responders: Readonly<Record<string, FakeLlmResponder>>;
  /** Models that reject sampling parameters, mirroring the real API (400). */
  noSamplingModels?: readonly string[];
  latencyMs?: number;
  /** Answer the next n calls with a schema-violating tool input (runner retry tests). */
  invalidNext?: { remaining: number };
  /** Fail the next n calls with the given HTTP status. */
  failNext?: { remaining: number; status: number };
}

interface MessagesBody {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: Array<{ name: string }>;
  tool_choice?: { type: string; name?: string };
  thinking?: { type: string };
  temperature?: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_fake' } });

const apiError = (status: number, type: string, message: string) =>
  json({ type: 'error', error: { type, message } }, status);

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

interface StoredBatch {
  id: string;
  createdAt: string;
  lines: string[];
  retrieved: number;
}

export function createFakeAnthropicFetch(options: FakeAnthropicOptions): FetchLike {
  const batches = new Map<string, StoredBatch>();
  let counter = 0;

  function answer(body: MessagesBody): { status: number; message?: unknown; error?: Response } {
    const toolName = body.tool_choice?.type === 'tool' ? body.tool_choice.name : undefined;
    if (!toolName || !body.tools?.some((t) => t.name === toolName)) {
      return { status: 400, error: apiError(400, 'invalid_request_error', 'fake: forced tool_choice required') };
    }
    if (body.temperature !== undefined && options.noSamplingModels?.includes(body.model)) {
      return { status: 400, error: apiError(400, 'invalid_request_error', `temperature is not supported for ${body.model}`) };
    }
    const responder = options.responders[toolName];
    if (!responder) return { status: 400, error: apiError(400, 'invalid_request_error', `fake: no responder for ${toolName}`) };
    const user = body.messages.map((m) => m.content).join('\n');
    let input: unknown;
    if (options.invalidNext && options.invalidNext.remaining > 0) {
      options.invalidNext.remaining -= 1;
      input = { unexpected: true };
    } else {
      input = responder({ model: body.model, system: body.system ?? '', user, toolName });
    }
    counter += 1;
    const id = hashString(`${user}|${toolName}|${counter}`).toString(36);
    return {
      status: 200,
      message: {
        id: `msg_fake_${id}`,
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'tool_use', id: `toolu_fake_${id}`, name: toolName, input }],
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
          input_tokens: estimateTokens((body.system ?? '') + user + JSON.stringify(body.tools)),
          output_tokens: estimateTokens(JSON.stringify(input)) + 20,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    };
  }

  function batchView(batch: StoredBatch, origin: string) {
    const ended = batch.retrieved > 0;
    return {
      id: batch.id,
      type: 'message_batch',
      processing_status: ended ? 'ended' : 'in_progress',
      request_counts: {
        processing: ended ? 0 : batch.lines.length,
        succeeded: ended ? batch.lines.length : 0,
        errored: 0,
        canceled: 0,
        expired: 0,
      },
      created_at: batch.createdAt,
      ended_at: ended ? batch.createdAt : null,
      expires_at: batch.createdAt,
      archived_at: null,
      cancel_initiated_at: null,
      results_url: ended ? `${origin}/v1/messages/batches/${batch.id}/results` : null,
    };
  }

  return async (input, init) => {
    if (options.latencyMs) await new Promise((r) => setTimeout(r, options.latencyMs));
    const url = new URL(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    if (!headers.get('x-api-key')) return apiError(401, 'authentication_error', 'fake: x-api-key missing');
    if (options.failNext && options.failNext.remaining > 0) {
      options.failNext.remaining -= 1;
      return apiError(options.failNext.status, options.failNext.status === 529 ? 'overloaded_error' : 'api_error', 'fake: injected failure');
    }

    if (method === 'POST' && url.pathname === '/v1/messages') {
      const result = answer(JSON.parse(String(init?.body ?? '{}')) as MessagesBody);
      return result.error ?? json(result.message);
    }

    if (method === 'POST' && url.pathname === '/v1/messages/batches') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { requests: Array<{ custom_id: string; params: MessagesBody }> };
      const id = `msgbatch_fake_${hashString(JSON.stringify(body.requests.map((r) => r.custom_id))).toString(36)}_${++counter}`;
      const lines = body.requests.map((r) => {
        const result = answer(r.params);
        return JSON.stringify({
          custom_id: r.custom_id,
          result: result.message
            ? { type: 'succeeded', message: result.message }
            : { type: 'errored', error: { type: 'error', error: { type: 'invalid_request_error', message: 'fake' } } },
        });
      });
      const batch: StoredBatch = { id, createdAt: new Date(0).toISOString(), lines, retrieved: 0 };
      batches.set(id, batch);
      return json(batchView(batch, url.origin));
    }

    const match = /^\/v1\/messages\/batches\/([^/]+)(\/results)?$/.exec(url.pathname);
    if (method === 'GET' && match?.[1]) {
      const batch = batches.get(match[1]);
      if (!batch) return apiError(404, 'not_found_error', 'fake: unknown batch');
      if (match[2]) {
        return new Response(`${batch.lines.join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/binary' } });
      }
      const view = batchView(batch, url.origin);
      batch.retrieved += 1;
      return json(view);
    }

    return apiError(404, 'not_found_error', `fake: ${method} ${url.pathname}`);
  };
}
