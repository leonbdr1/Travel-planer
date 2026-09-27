import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createPostgresDb } from '@reiseplaner/db';
import { healthResponseSchema, metaConfigResponseSchema } from '@reiseplaner/contracts';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  it('reports ok with the database reachable through Hyperdrive', async () => {
    const res = await exports.default.fetch('http://app.test/api/v1/health');
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body).toEqual({ status: 'ok', db: 'ok', version: 'test-sha', product: 'reiseplaner' });
  });

  it('answers 503 degraded when the database is down', async () => {
    const app = createApp({
      dbFactory: () => createPostgresDb('postgres://postgres:postgres@127.0.0.1:9/postgres', { connectTimeoutS: 1 }),
    });
    const res = await app.request('/api/v1/health', {}, env);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: 'degraded', db: 'down' });
  });

  it('sets the security headers on API responses', async () => {
    const res = await exports.default.fetch('http://app.test/api/v1/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
  });
});

describe('GET /api/v1/meta/config', () => {
  it('exposes the runtime environment', async () => {
    const res = await exports.default.fetch('http://app.test/api/v1/meta/config');
    const body = metaConfigResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ app_env: 'test', providers_mode: 'fake', llm_enabled: true });
  });
});

describe('API conventions', () => {
  it('rejects bodies over 16 KB before parsing', async () => {
    const res = await exports.default.fetch('http://app.test/api/v1/meta/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(17 * 1024) }),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: 'payload_too_large' } });
  });

  it('answers unknown API paths with the uniform error format', async () => {
    const res = await exports.default.fetch('http://app.test/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'Diese Adresse gibt es nicht.' } });
  });

  it('fails closed on an invalid configuration', async () => {
    const app = createApp();
    const res = await app.request('/api/v1/meta/config', {}, { ...env, PROVIDERS_MODE: 'nonsense' });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: { code: 'misconfigured' } });
  });
});
