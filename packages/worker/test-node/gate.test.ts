// Site gate (Ben, 2026-09-29): the deployed site stays reachable at its final
// URL but shows only a public page until somebody signs in. First visit: setup
// of two passwords (admin, user); afterwards a plain login.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSetting, incrementRateLimit, setSettingIfAbsent } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { z } from 'zod';
import type { Env } from '../src/env';
import { GATE_COOKIE, GATE_LOGIN_MAX_ATTEMPTS, GATE_PASSWORD_MIN_LENGTH, gateRole, handleGate, type GateCredentials, type GateOptions } from '../src/gate';

const ADMIN = 'admin correct horse battery';
const USER = 'tester correct horse battery';
const base = { APP_ENV: 'test', SITE_GATE: 'password', SIGNING_KEY: 'gate-signing-key', IP_HASH_SALT: 'salt' } as unknown as Env;
/** The environment without the given keys (optional properties must be absent, not undefined). */
const without = (...keys: Array<keyof Env>): Env => {
  const copy = { ...base };
  for (const key of keys) delete copy[key];
  return copy;
};
const T0 = new Date('2026-09-29T12:00:00Z');
const ORIGIN = 'https://site.example';
const record = z.object({ salt: z.string(), hash: z.string(), iterations: z.number() });
const credentialsSchema = z.object({ admin: record, user: record });

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
    store: {
      load: () => getSetting(test.db, 'gate.credentials', credentialsSchema) as Promise<GateCredentials | null>,
      create: (credentials) => setSettingIfAbsent(test.db, 'gate.credentials', credentials),
    },
  };
}

const get = (path: string, cookie?: string) => new Request(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
const form = (path: string, fields: Record<string, string>, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, { method: 'POST', body: new URLSearchParams(fields), headers: { origin: ORIGIN, ...headers } });
const post = (password: string, headers: Record<string, string> = {}) => form('/gate/login', { password }, headers);
const setupForm = (over: Record<string, string> = {}) => form('/gate/setup', { admin: ADMIN, admin2: ADMIN, user: USER, user2: USER, ...over });

const cookieOf = (res: Response | null) => (res?.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
async function setUp(env: Env = base): Promise<string> {
  return cookieOf(await handleGate(setupForm(), env, options()));
}
async function signIn(password: string, env: Env = base): Promise<string> {
  return cookieOf(await handleGate(post(password), env, options()));
}

describe('site gate', () => {
  it('is off without SITE_GATE=password (dev, tests)', async () => {
    expect(await handleGate(get('/'), without('SITE_GATE'), options())).toBeNull();
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

  it('lets the health check and robots.txt through without login', async () => {
    expect(await handleGate(get('/api/v1/health'), base, options())).toBeNull();
    const robots = await handleGate(get('/robots.txt'), base, options());
    expect(await robots!.text()).toContain('Disallow: /');
  });

  it('closes the site without a signing key, but keeps the health check', async () => {
    const noKey = without('SIGNING_KEY');
    expect((await handleGate(get('/'), noKey, options()))?.status).toBe(503);
    expect((await handleGate(setupForm(), noKey, options()))?.status).toBe(503);
    expect(await handleGate(get('/api/v1/health'), noKey, options())).toBeNull();
  });
});

describe('first setup', () => {
  it('shows the setup form until the passwords exist, then the login', async () => {
    const first = await handleGate(get('/gate'), base, options());
    const html = await first!.text();
    expect(first!.status).toBe(200);
    expect(html).toContain('action="/gate/setup"');
    expect(html).toContain('noindex');
    expect(first!.headers.get('x-robots-tag')).toContain('noindex');
    await setUp();
    const later = await (await handleGate(get('/gate'), base, options()))!.text();
    expect(later).toContain('action="/gate/login"');
    expect(later).not.toContain('action="/gate/setup"');
  });

  it('stores only salted hashes and signs the setter in as admin', async () => {
    const res = await handleGate(setupForm(), base, options());
    expect(res?.status).toBe(303);
    expect(res?.headers.get('location')).toBe('/');
    const cookie = cookieOf(res);
    expect(await gateRole(get('/', cookie), base, T0)).toBe('admin');
    const stored = JSON.stringify(await getSetting(test.db, 'gate.credentials', credentialsSchema));
    expect(stored).not.toContain(ADMIN);
    expect(stored).not.toContain(USER);
    const creds = await getSetting(test.db, 'gate.credentials', credentialsSchema);
    expect(creds?.admin.salt).not.toBe(creds?.user.salt);
  });

  it.each([
    ['too short', { admin: 'short', admin2: 'short' }],
    ['repeat differs', { user2: `${USER}x` }],
    ['same password twice', { user: ADMIN, user2: ADMIN }],
  ])('rejects the setup when %s and stores nothing', async (_name, over) => {
    const res = await handleGate(setupForm(over), base, options());
    expect(res?.status).toBe(400);
    expect(res?.headers.get('set-cookie')).toBeNull();
    expect(await getSetting(test.db, 'gate.credentials', credentialsSchema)).toBeNull();
    expect(GATE_PASSWORD_MIN_LENGTH).toBeGreaterThan(5);
  });

  it('never overwrites existing passwords: a second setup only redirects', async () => {
    await setUp();
    const again = await handleGate(setupForm({ admin: 'another password 1', admin2: 'another password 1' }), base, options());
    expect(again?.status).toBe(303);
    expect(again?.headers.get('location')).toBe('/gate');
    expect(again?.headers.get('set-cookie')).toBeNull();
    expect(await signIn(ADMIN)).not.toBe('');
    expect(await signIn('another password 1')).toBe('');
  });

  it('stores the passwords once when two setups race', async () => {
    const [a, b] = await Promise.all([handleGate(setupForm(), base, options()), handleGate(setupForm({ admin: 'second admin pass', admin2: 'second admin pass' }), base, options())]);
    expect([a?.headers.get('set-cookie'), b?.headers.get('set-cookie')].filter(Boolean)).toHaveLength(1);
  });

  it('refuses a setup from another origin and fails closed when the store is down', async () => {
    const evil = await handleGate(form('/gate/setup', { admin: ADMIN, admin2: ADMIN, user: USER, user2: USER }, { origin: 'https://evil.example' }), base, options());
    expect(evil?.status).toBe(403);
    const down: GateOptions = { ...options(), store: { load: async () => { throw new Error('db'); }, create: async () => { throw new Error('db'); } } };
    expect((await handleGate(get('/gate'), base, down))?.status).toBe(503);
    expect((await handleGate(setupForm(), base, down))?.status).toBe(503);
    expect((await handleGate(post(ADMIN), base, down))?.status).toBe(503);
  });

  it('limits setup attempts per client', async () => {
    for (let i = 0; i < GATE_LOGIN_MAX_ATTEMPTS; i += 1) expect((await handleGate(setupForm({ admin: 'x', admin2: 'x' }), base, options()))?.status).toBe(400);
    expect((await handleGate(setupForm(), base, options()))?.status).toBe(429);
  });

  it('sends a login without setup back to the gate page', async () => {
    const res = await handleGate(post(ADMIN), base, options());
    expect(res?.status).toBe(303);
    expect(res?.headers.get('location')).toBe('/gate');
  });
});

describe('login with two roles', () => {
  beforeEach(async () => {
    await setUp();
  });

  it('gives the admin password the admin role and the user password the user role', async () => {
    const admin = await signIn(ADMIN);
    const user = await signIn(USER);
    expect(await gateRole(get('/', admin), base, T0)).toBe('admin');
    expect(await gateRole(get('/', user), base, T0)).toBe('user');
    expect(await gateRole(get('/'), base, T0)).toBeNull();
  });

  it('rejects a wrong password and sets a hardened cookie for the right one', async () => {
    expect((await handleGate(post('wrong'), base, options()))?.status).toBe(401);
    const ok = await handleGate(post(USER), base, options());
    expect(ok?.status).toBe(303);
    const cookie = ok?.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${GATE_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).not.toContain(USER);
  });

  it('opens the site with either cookie and redirects the gate page to the app', async () => {
    for (const cookie of [await signIn(ADMIN), await signIn(USER)]) {
      expect(await handleGate(get('/suche', cookie), base, options())).toBeNull();
      expect(await handleGate(get('/api/v1/meta', cookie), base, options())).toBeNull();
      expect((await handleGate(get('/gate', cookie), base, options()))?.headers.get('location')).toBe('/');
    }
  });

  it('rejects tampered, expired and re-signed cookies (a user cannot claim admin)', async () => {
    const cookie = await signIn(USER);
    const [name, value] = cookie.split('=') as [string, string];
    const [expires, role, signature] = value.split('.') as [string, string, string];
    expect(role).toBe('user');
    expect((await handleGate(get('/', `${name}=${Number(expires) + 1000}.${role}.${signature}`), base, options()))?.status).toBe(303);
    expect((await handleGate(get('/', `${name}=${expires}.admin.${signature}`), base, options()))?.status).toBe(303);
    expect((await handleGate(get('/', `${name}=${expires}.${role}.${signature.slice(1)}x`), base, options()))?.status).toBe(303);
    const later = new Date(T0.getTime() + 31 * 86_400_000);
    expect((await handleGate(get('/', cookie), base, options(later)))?.status).toBe(303);
    expect((await handleGate(get('/', cookie), { ...base, SIGNING_KEY: 'another key' } as Env, options()))?.status).toBe(303);
  });

  it('limits wrong attempts per client, also for the right password afterwards', async () => {
    for (let i = 0; i < GATE_LOGIN_MAX_ATTEMPTS; i += 1) expect((await handleGate(post('nope'), base, options()))?.status).toBe(401);
    const blocked = await handleGate(post(ADMIN), base, options());
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('set-cookie')).toBeNull();
  });

  it('fails closed when the counter is unreachable', async () => {
    const broken: GateOptions = { ...options(), limitAttempts: async () => 'failed' };
    const res = await handleGate(post(ADMIN), base, broken);
    expect(res?.status).toBe(503);
    expect(res?.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a login from another origin', async () => {
    const res = await handleGate(post(ADMIN, { origin: 'https://evil.example' }), base, options());
    expect(res?.status).toBe(403);
    expect(res?.headers.get('set-cookie')).toBeNull();
  });
});
