// Developer page (S11.8): the AI switch keeps local test runs free of AI
// costs (real model: off until switched on; simulated model: on), /meta/config
// reports the effective state, the page never exists outside dev and test,
// and local dev gets the higher search limits.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { productConfig } from '@reiseplaner/config';
import { devSettingsResponseSchema, metaConfigResponseSchema } from '@reiseplaner/contracts';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createApp } from '../src/app';
import { parseRuntimeConfig, type Env } from '../src/env';
import { effectiveLlmEnabled } from '../src/services/dev-settings';

const base = {
  APP_ENV: 'dev',
  PROVIDERS_MODE: 'sandbox',
  LLM_ENABLED: 'true',
  LITEAPI_BASE_URL: 'https://api.liteapi.travel/v3.0',
  LITEAPI_BOOK_BASE_URL: 'https://book.liteapi.travel/v3.0',
  LITEAPI_PAYMENT_MODE: 'sandbox',
  ORS_BASE_URL: 'https://api.heigit.org/openrouteservice',
  HYPERDRIVE: { connectionString: 'unused' },
};
const env = (extra: Record<string, string> = {}) => ({ ...base, ...extra }) as unknown as Env;

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => test.close());

const app = () => createApp({ dbFactory: () => ({ ...test.db, close: async () => undefined }) });
const settings = async (e: Env, init?: RequestInit) => {
  const res = await app().request('/api/v1/dev/settings', init ?? {}, e as never);
  return { status: res.status, body: (await res.json()) as unknown };
};
const put = (enabled: boolean) => ({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ai_enabled: enabled }) });
const meta = async (e: Env) => metaConfigResponseSchema.parse(await (await app().request('/api/v1/meta/config', {}, e as never)).json());

describe('AI switch', () => {
  it('keeps the real model off until switched on, and reports it', async () => {
    const e = env();
    const before = devSettingsResponseSchema.parse((await settings(e)).body);
    expect(before.ai).toMatchObject({ available: true, source: 'real', switched: null, enabled: false, spent_today_usd: 0 });
    expect((await meta(e)).llm_enabled).toBe(false);
    expect((await meta(e)).dev_settings).toBe(true);

    const on = devSettingsResponseSchema.parse((await settings(e, put(true))).body);
    expect(on.ai.enabled).toBe(true);
    expect(await effectiveLlmEnabled(test.db, parseRuntimeConfig(e, 'v'))).toBe(true);
    expect((await meta(e)).llm_enabled).toBe(true);

    const off = devSettingsResponseSchema.parse((await settings(e, put(false))).body);
    expect(off.ai).toMatchObject({ switched: false, enabled: false });
  });

  it('leaves the simulated model on, and LLM_ENABLED=false always wins', async () => {
    expect(await effectiveLlmEnabled(test.db, parseRuntimeConfig(env({ PROVIDERS_MODE: 'fake' }), 'v'))).toBe(true);
    await settings(env(), put(true));
    expect(await effectiveLlmEnabled(test.db, parseRuntimeConfig(env({ LLM_ENABLED: 'false' }), 'v'))).toBe(false);
  });

  it('does not exist outside dev and test, and never changes staging or production', async () => {
    await settings(env(), put(false));
    const staging = env({ APP_ENV: 'staging' });
    expect((await settings(staging)).status).toBe(404);
    expect((await settings(staging, put(true))).status).toBe(404);
    expect(await effectiveLlmEnabled(test.db, parseRuntimeConfig(staging, 'v'))).toBe(true);
    expect((await meta(staging)).dev_settings).toBe(false);
  });

  it('rejects anything but a boolean switch', async () => {
    const res = await settings(env(), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ai_enabled: 'yes' }) });
    expect(res.status).toBe(400);
  });

  it('shows the higher local search limits', async () => {
    const body = devSettingsResponseSchema.parse((await settings(env())).body);
    expect(body.limits).toEqual(productConfig.limits.dev_rate_limits);
    expect(body.limits.searches_per_hour).toBeGreaterThan(productConfig.limits.rate_limits.searches_per_hour);
  });
});
