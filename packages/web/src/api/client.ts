// Typed API client: every response is parsed with the shared zod contracts.
// Calls give up after API_REQUEST_TIMEOUT_MS; a lost connection and a timeout
// become ApiRequestError with a German message (status 0), and server errors
// name the request id so support can find the request in the logs.
import type { z } from 'zod';
import { apiErrorSchema } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { de } from '../i18n/de';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly body?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Accept non-2xx statuses that still carry a schema-conform body (e.g. health 503). */
  acceptStatuses?: number[];
  timeoutMs?: number;
}

/** The caller's signal and the timeout in one; the caller's abort stays an AbortError. */
function withTimeout(signal: AbortSignal | undefined, ms: number): { signal: AbortSignal; timedOut: () => boolean; done: () => void } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    },
  };
}

export async function apiRequest<S extends z.ZodType>(path: string, schema: S, options: RequestOptions = {}): Promise<z.infer<S>> {
  const limit = withTimeout(options.signal, options.timeoutMs ?? constants.API_REQUEST_TIMEOUT_MS);
  const init: RequestInit = {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: limit.signal,
  };
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, init);
  } catch (err) {
    if (limit.timedOut()) throw new ApiRequestError(0, 'timeout', de.status.timeout);
    // The caller aborted (new filters, page left): pass the AbortError on unchanged.
    if (options.signal?.aborted) throw err;
    throw new ApiRequestError(0, 'network', de.status.offline);
  } finally {
    limit.done();
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok && !options.acceptStatuses?.includes(res.status)) {
    const requestId = res.headers.get('x-request-id') ?? undefined;
    const parsed = apiErrorSchema.safeParse(body);
    const message = parsed.success ? parsed.data.error.message : de.status.apiUnreachable;
    // Server faults carry a short id; the guest can quote it, support finds the log line.
    const shown = res.status >= 500 && requestId ? `${message} ${de.status.errorId(requestId.slice(0, 8))}` : message;
    throw new ApiRequestError(res.status, parsed.success ? parsed.data.error.code : 'http_error', shown, parsed.success ? parsed.data.error.details : undefined, body, requestId);
  }
  return schema.parse(body);
}
