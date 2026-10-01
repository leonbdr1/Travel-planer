// API client (B6): lost connection and timeout as German messages, the
// caller's own abort unchanged, and server faults with a short error id.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest, ApiRequestError } from '../src/api/client';
import { de } from '../src/i18n/de';

const ok = z.object({ ok: z.literal(true) });

afterEach(() => vi.unstubAllGlobals());

/** A fetch that only ends when its signal aborts. */
const hangingFetch = () =>
  vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));

describe('apiRequest', () => {
  it('turns a lost connection into a readable error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(apiRequest('/x', ok)).rejects.toMatchObject({ status: 0, code: 'network', message: de.status.offline });
  });

  it('gives up after the timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    await expect(apiRequest('/x', ok, { timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout', message: de.status.timeout });
  });

  it("passes the caller's own abort on as an AbortError", async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();
    const pending = apiRequest('/x', ok, { signal: controller.signal, timeoutMs: 10_000 });
    controller.abort();
    const err = await pending.catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ApiRequestError);
    expect((err as Error).name).toBe('AbortError');
  });

  it('names the request id of a server fault, not of a client error', async () => {
    const respond = (status: number, code: string) =>
      vi.fn(async () => new Response(JSON.stringify({ error: { code, message: 'Interner Fehler.' } }), { status, headers: { 'x-request-id': '8c9f3b2a1d4e5f6a-FRA' } }));
    vi.stubGlobal('fetch', respond(500, 'internal'));
    await expect(apiRequest('/x', ok)).rejects.toMatchObject({ status: 500, message: 'Interner Fehler. (Fehler-ID 8c9f3b2a)', requestId: '8c9f3b2a1d4e5f6a-FRA' });
    vi.stubGlobal('fetch', respond(404, 'not_found'));
    await expect(apiRequest('/x', ok)).rejects.toMatchObject({ status: 404, message: 'Interner Fehler.' });
  });
});
