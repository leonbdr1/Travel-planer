// Site gate (Ben, 2026-09-29): the deployed site stays reachable at its final
// URL but shows only a public page with a password form until it goes public.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { incrementRateLimit } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import type { Env } from '../src/env';
import { GATE_COOKIE, GATE_LOGIN_MAX_ATTEMPTS, handleGate, type GateOptions } from '../src/gate';

const PASSWORD = 'correct horse battery staple';
const base = { APP_ENV: 'test', SITE_GATE: 'password', SITE_PASSWORD: PASSWORD, SIGNING_KEY: 'gate-signing-key', IP_HASH_SALT: 'salt' } as unknown as Env;
const T0 = new Date('2026-09-29T12:00:00Z');
const ORIGIN = 'https://site.example';

let test: TestDb;
beforeEach(async () => {
  test = await createTestDb();
});
afterEach(async () => test.close());

function options(now: Date = T0): GateOptions {
  return {
    now: () => now,
    limitAttempts: async (key, max, windowS) => {
      const r = await incrementRateLimit(test.db, key, max, windowS);
      return r.failed ? 'failed' : r.allowed ? 'ok' : 'limited';
    },
  };
}

const get = (path: string, cookie?: string) => new Request(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
const post = (password: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/gate/login`, { method: 'POST', body: new URLSearchParams({ password }), headers: { origin: ORIGIN, ...headers } });

async function signIn(env: Env = base): Promise<string> {
  const res = await handleGate(post(PASSWORD), env, options());
  const cookie = res?.headers.get('set-cookie') ?? '';
  return cookie.split(';')[0] ?? '';
}

describe('site gate', () => {
  it('is off without SITE_GATE=password (dev, tests)', async () => {
    expect(await handleGate(get('/'), { ...base, SITE_GATE: undefined } as Env, options())).toBeNull();
    expect(await handleGate(get('/api/v1/searches'), { ...base, SITE_GATE: 'off' } as Env, options())).toBeNull();
  });

  it('sends visitors to the public gate page and keeps the API shut', async () => {
    const home = await handleGate(get('/suche'), base, options());
    expect(home?.status).toBe(303);
    expect(home?.headers.get('location')).toBe('/gate');
    const api = await handleGate(get('/api/v1/searches/abc'), base, options());
    expect(api?.status).toBe(401);
    expect(await handleGate(new Request(`${ORIGIN}/api/v1/searches`, { method: 'POST' }), base, options()).then((r) => r?.status)).toBe(401);
  });

  it('shows a public page with a form, name and contact, never the password', async () => {
    const res = await handleGate(get('/gate'), base, options());
    const html = await res!.text();
    expect(res!.status).toBe(200);
    expect(html).toContain('type="password"');
    expect(html).toContain('Reiseplaner');
    expect(html).toContain('noindex');
    expect(res!.headers.get('x-robots-tag')).toContain('noindex');
    expect(html).not.toContain(PASSWORD);
  });

  it('lets the health check and robots.txt through without login', async () => {
    expect(await handleGate(get('/api/v1/health'), base, options())).toBeNull();
    const robots = await handleGate(get('/robots.txt'), base, options());
    expect(await robots!.text()).toContain('Disallow: /');
  });

  it('rejects a wrong password and accepts the right one with a signed cookie', async () => {
    expect((await handleGate(post('wrong'), base, options()))?.status).toBe(401);
    const ok = await handleGate(post(PASSWORD), base, options());
    expect(ok?.status).toBe(303);
    const cookie = ok?.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${GATE_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).not.toContain(PASSWORD);
  });

  it('opens the site with the cookie and redirects the gate page to the app', async () => {
    const cookie = await signIn();
    expect(await handleGate(get('/suche', cookie), base, options())).toBeNull();
    expect(await handleGate(get('/api/v1/meta', cookie), base, options())).toBeNull();
    expect((await handleGate(get('/gate', cookie), base, options()))?.headers.get('location')).toBe('/');
  });

  it('rejects tampered, expired and old-password cookies', async () => {
    const cookie = await signIn();
    const [name, value] = cookie.split('=') as [string, string];
    const [expires, signature] = value.split('.') as [string, string];
    expect((await handleGate(get('/', `${name}=${Number(expires) + 1000}.${signature}`), base, options()))?.status).toBe(303);
    expect((await handleGate(get('/', `${name}=${expires}.${signature.slice(1)}x`), base, options()))?.status).toBe(303);
    const later = new Date(T0.getTime() + 31 * 86_400_000);
    expect((await handleGate(get('/', cookie), base, options(later)))?.status).toBe(303);
    // Changing the password logs everyone out.
    expect((await handleGate(get('/', cookie), { ...base, SITE_PASSWORD: 'another password' } as Env, options()))?.status).toBe(303);
  });

  it('limits wrong attempts per client, also for the right password afterwards', async () => {
    for (let i = 0; i < GATE_LOGIN_MAX_ATTEMPTS; i += 1) expect((await handleGate(post('nope'), base, options()))?.status).toBe(401);
    const blocked = await handleGate(post(PASSWORD), base, options());
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('set-cookie')).toBeNull();
  });

  it('fails closed when the counter is unreachable', async () => {
    const broken: GateOptions = { now: () => T0, limitAttempts: async () => 'failed' };
    const res = await handleGate(post(PASSWORD), base, broken);
    expect(res?.status).toBe(503);
    expect(res?.headers.get('set-cookie')).toBeNull();
  });

  it('closes the site when the secret is missing, but keeps the health check', async () => {
    const env = { ...base, SITE_PASSWORD: undefined } as Env;
    expect((await handleGate(get('/'), env, options()))?.status).toBe(503);
    expect((await handleGate(post(''), env, options()))?.status).toBe(503);
    expect(await handleGate(get('/api/v1/health'), env, options())).toBeNull();
    const noKey = { ...base, SIGNING_KEY: undefined } as Env;
    expect((await handleGate(get('/'), noKey, options()))?.status).toBe(503);
  });

  it('refuses a login from another origin', async () => {
    const res = await handleGate(post(PASSWORD, { origin: 'https://evil.example' }), base, options());
    expect(res?.status).toBe(403);
    expect(res?.headers.get('set-cookie')).toBeNull();
  });
});
