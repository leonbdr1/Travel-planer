// JSON over HTTP with timeout, bounded retries (exponential backoff for 429,
// 5xx, timeouts and network errors) and zod validation of the response.
import type { z } from 'zod';
import { ProviderError } from './errors';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface RequestJsonOptions<S extends z.ZodType> {
  provider: string;
  endpoint: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: unknown;
  /** A body that is not JSON (e.g. a form); sent as is with `contentType`. */
  bodyText?: { text: string; contentType: string };
  schema: S;
  fetch: FetchLike;
  timeoutMs: number;
  maxRetries: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called once per HTTP attempt (usage counting). */
  onAttempt?: (endpoint: string) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function kindForStatus(status: number): ProviderError['kind'] {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'client';
}

export async function requestJson<S extends z.ZodType>(options: RequestJsonOptions<S>): Promise<z.infer<S>> {
  const sleep = options.sleep ?? defaultSleep;
  let lastError: ProviderError | undefined;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    if (attempt > 0) await sleep(250 * 2 ** (attempt - 1));
    options.onAttempt?.(options.endpoint);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let res: Response;
    try {
      const text = options.bodyText;
      res = await options.fetch(options.url, {
        method: options.method ?? (options.body === undefined && !text ? 'GET' : 'POST'),
        headers: {
          accept: 'application/json',
          ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(text ? { 'content-type': text.contentType } : {}),
          ...options.headers,
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        ...(text ? { body: text.text } : {}),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = (err as Error).name === 'AbortError' || controller.signal.aborted;
      lastError = new ProviderError(
        options.provider,
        aborted ? 'timeout' : 'network',
        `${options.endpoint} ${aborted ? 'timed out' : 'network error'}`,
      );
      continue;
    }
    clearTimeout(timer);
    if (!res.ok) {
      // A short excerpt of the provider's error body (never request headers or keys) for diagnosis.
      const excerpt = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
      lastError = new ProviderError(
        options.provider,
        kindForStatus(res.status),
        `${options.endpoint} HTTP ${res.status}${excerpt ? `: ${excerpt}` : ''}`,
        res.status,
      );
      if (!lastError.retryable) throw lastError;
      continue;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new ProviderError(options.provider, 'bad_response', `${options.endpoint} returned invalid JSON`, res.status);
    }
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      const where = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '(root)'} (${i.message})`)
        .join(', ');
      throw new ProviderError(options.provider, 'bad_response', `${options.endpoint} schema mismatch at ${where}`, res.status);
    }
    return parsed.data;
  }
  throw lastError ?? new ProviderError(options.provider, 'network', `${options.endpoint} failed`);
}
