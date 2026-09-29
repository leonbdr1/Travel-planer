// Site gate (Ben, 2026-09-29): until the product goes public, the deployed site
// is reachable at its final URL but shows only a public page with a password
// form. After the login (cookie signed with SIGNING_KEY) the SPA and the API
// work as usual. Active with SITE_GATE=password; a missing SIGNING_KEY closes
// the site (fail-closed). Public paths: the gate page, the login and setup
// forms, robots.txt and the health check (watchdog, smoke test).
//
// Two passwords (Ben, 2026-09-29): an admin password (developer page, AI
// switch, test banner) and a user password for testers, who see the site as an
// end customer does. Nobody sets them in a file: the first visit shows a setup
// form for both; the salted PBKDF2 hashes live in app.meta_kv (`GateStore`).
// The role is in the signed cookie; `gateRole` reads it for the app.
//
// Wrong attempts are limited per client through `limitAttempts` (database
// counter, fail-closed): 10 per 15 minutes, for the login and the setup alike.
import { productConfig } from '@reiseplaner/config';
import type { Env } from './env';
import { hashClient } from './http/client';
import { baseSecurityHeaders } from './http/security-headers';

export const GATE_COOKIE = 'rp_gate';
export const GATE_SESSION_DAYS = 30;
export const GATE_LOGIN_MAX_ATTEMPTS = 10;
export const GATE_LOGIN_WINDOW_S = 900;
export const GATE_PASSWORD_MIN_LENGTH = 10;
export const GATE_PASSWORD_MAX_LENGTH = 200;
/** The Workers runtime rejects PBKDF2 with more iterations. */
export const GATE_PBKDF2_ITERATIONS = 100_000;
/** Request header the entry point sets for the app; never trusted from a client. */
export const ROLE_HEADER = 'x-site-role';

export type AttemptResult = 'ok' | 'limited' | 'failed';
export type GateRole = 'admin' | 'user';

export interface PasswordRecord {
  salt: string;
  hash: string;
  iterations: number;
}

export interface GateCredentials {
  admin: PasswordRecord;
  user: PasswordRecord;
}

export interface GateStore {
  /** `null` until the first setup; throws when the database is unreachable. */
  load: () => Promise<GateCredentials | null>;
  /** Atomic first write; `false` when the passwords already exist. */
  create: (credentials: GateCredentials) => Promise<boolean>;
}

export interface GateOptions {
  now: () => Date;
  /** Counts one login attempt of `key`; `failed` when the counter is unreachable. */
  limitAttempts: (key: string, max: number, windowS: number) => Promise<AttemptResult>;
  store: GateStore;
}

const enc = new TextEncoder();

const b64url = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 1);
  return diff === 0;
}

const fromB64url = (text: string): Uint8Array => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations }, key, 256));
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64url(salt.buffer as ArrayBuffer), hash: b64url((await pbkdf2(password, salt, GATE_PBKDF2_ITERATIONS)).buffer as ArrayBuffer), iterations: GATE_PBKDF2_ITERATIONS };
}

async function verifyPassword(given: string, record: PasswordRecord): Promise<boolean> {
  return constantTimeEqual(await pbkdf2(given, fromB64url(record.salt), record.iterations), fromB64url(record.hash));
}

async function sign(env: Env, role: GateRole, expires: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SIGNING_KEY ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(`gate|${role}|${expires}`)));
}

async function sessionValue(env: Env, role: GateRole, now: Date): Promise<string> {
  const expires = Math.floor(now.getTime() / 1000) + GATE_SESSION_DAYS * 86_400;
  return `${expires}.${role}.${await sign(env, role, expires)}`;
}

/** The role in the signed session cookie, `null` without a valid one (no database access). */
export async function gateRole(request: Request, env: Env, now: Date): Promise<GateRole | null> {
  if (env.SITE_GATE !== 'password' || !env.SIGNING_KEY) return null;
  const cookie = request.headers.get('cookie') ?? '';
  const raw = cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${GATE_COOKIE}=`))
    ?.slice(GATE_COOKIE.length + 1);
  if (!raw) return null;
  const [expiresText, role, signature] = raw.split('.');
  const expires = Number(expiresText);
  if ((role !== 'admin' && role !== 'user') || !signature || !Number.isInteger(expires) || expires * 1000 < now.getTime()) return null;
  const expected = await sign(env, role, expires);
  return constantTimeEqual(enc.encode(signature), enc.encode(expected)) ? role : null;
}

const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TEXTS = {
  title: (name: string) => `${name}: Zugang`,
  intro: (name: string) => `${name} ist eine Unterkunftssuche, die viele Orte und Termine auf einmal vergleicht. Das Produkt ist in Entwicklung und noch nicht öffentlich. Der Zugang ist derzeit nur mit Passwort möglich.`,
  label: 'Passwort',
  setupIntro: (name: string) => `Willkommen bei ${name}. Lege jetzt die beiden Passwörter fest. Du kannst sie später nicht auf dieser Seite ändern.`,
  adminLabel: 'Admin-Passwort (für dich: Entwicklerseite, KI-Schalter)',
  userLabel: 'Nutzer-Passwort (für Tester: sehen die Seite wie Endkunden)',
  repeat: 'Wiederholen',
  setupSubmit: 'Passwörter festlegen',
  tooShort: `Jedes Passwort braucht mindestens ${GATE_PASSWORD_MIN_LENGTH} Zeichen.`,
  tooLong: `Ein Passwort darf höchstens ${GATE_PASSWORD_MAX_LENGTH} Zeichen haben.`,
  mismatch: 'Die Wiederholung stimmt nicht überein.',
  same: 'Admin- und Nutzer-Passwort müssen verschieden sein.',
  submit: 'Anmelden',
  wrong: 'Das Passwort stimmt nicht.',
  limited: 'Zu viele Versuche. Bitte warte einige Minuten.',
  unavailable: 'Die Anmeldung ist gerade nicht verfügbar. Bitte versuche es später noch einmal.',
  closed: 'Die Seite ist noch nicht freigeschaltet.',
  operator: (company: string) => `Betreiber: ${company}`,
  contact: 'Kontakt',
};

function page(status: number, message: string | null, extra: Record<string, string> = {}, setup = false): Response {
  const { name, brand, operator, support } = productConfig;
  const body = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(TEXTS.title(name))}</title>
<style>
body{margin:0;font:16px/1.5 ${brand.fonts.sans};background:#fafafa;color:#18181b}
main{max-width:26rem;margin:12vh auto;padding:0 1rem}
h1{font-size:1.5rem;margin:0 0 .5rem}
p{color:#3f3f46}
form{display:grid;gap:.75rem;margin-top:1.25rem}
input{font:inherit;padding:.6rem .75rem;border:1px solid #a1a1aa;border-radius:.5rem}
button{font:inherit;font-weight:600;padding:.6rem .75rem;border:0;border-radius:.5rem;background:${brand.colors.primary};color:${brand.colors.primary_contrast};cursor:pointer}
.err{color:${brand.colors.warning};font-weight:600}
small{display:block;margin-top:2rem;color:#52525b}
</style></head><body><main>
<h1>${esc(name)}</h1>
<p>${esc(setup ? TEXTS.setupIntro(name) : TEXTS.intro(name))}</p>
${message ? `<p class="err" role="alert">${esc(message)}</p>` : ''}
${
  setup
    ? `<form method="post" action="/gate/setup">
<label for="admin">${esc(TEXTS.adminLabel)}</label>
<input id="admin" name="admin" type="password" autocomplete="new-password" minlength="${GATE_PASSWORD_MIN_LENGTH}" maxlength="${GATE_PASSWORD_MAX_LENGTH}" required autofocus>
<label for="admin2">${esc(TEXTS.repeat)}</label>
<input id="admin2" name="admin2" type="password" autocomplete="new-password" required>
<label for="user">${esc(TEXTS.userLabel)}</label>
<input id="user" name="user" type="password" autocomplete="new-password" minlength="${GATE_PASSWORD_MIN_LENGTH}" maxlength="${GATE_PASSWORD_MAX_LENGTH}" required>
<label for="user2">${esc(TEXTS.repeat)}</label>
<input id="user2" name="user2" type="password" autocomplete="new-password" required>
<button type="submit">${esc(TEXTS.setupSubmit)}</button>
</form>`
    : `<form method="post" action="/gate/login">
<label for="pw">${esc(TEXTS.label)}</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">${esc(TEXTS.submit)}</button>
</form>`
}
<small>${esc(TEXTS.operator(operator.company))}<br>${esc(TEXTS.contact)}: ${esc(support.email)}</small>
</main></body></html>`;
  return new Response(body, {
    status,
    headers: {
      ...baseSecurityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extra,
    },
  });
}

function redirect(location: string, extra: Record<string, string> = {}): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store', ...extra } });
}

function sessionCookie(url: URL, value: string): Record<string, string> {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return { 'Set-Cookie': `${GATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GATE_SESSION_DAYS * 86_400}${secure}` };
}

/** Origin check and attempt counter shared by login and setup; a response ends the request. */
async function guardForm(request: Request, env: Env, options: GateOptions, scope: string, setup: boolean): Promise<Response | null> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin !== null && origin !== url.origin) return page(403, TEXTS.wrong, {}, setup);
  let key: string;
  try {
    key = `${scope}:${await hashClient(request, env.IP_HASH_SALT, env.APP_ENV, options.now())}`;
  } catch {
    return page(503, TEXTS.unavailable, {}, setup);
  }
  const attempt = await options.limitAttempts(key, GATE_LOGIN_MAX_ATTEMPTS, GATE_LOGIN_WINDOW_S);
  if (attempt === 'failed') return page(503, TEXTS.unavailable, {}, setup);
  if (attempt === 'limited') return page(429, TEXTS.limited, { 'Retry-After': String(GATE_LOGIN_WINDOW_S) }, setup);
  return null;
}

async function loadCredentials(options: GateOptions): Promise<GateCredentials | null | 'unavailable'> {
  try {
    return await options.store.load();
  } catch {
    return 'unavailable';
  }
}

async function login(request: Request, env: Env, options: GateOptions): Promise<Response> {
  const now = options.now();
  const credentials = await loadCredentials(options);
  if (credentials === 'unavailable') return page(503, TEXTS.unavailable);
  if (credentials === null) return redirect('/gate');
  const blocked = await guardForm(request, env, options, 'gate', false);
  if (blocked) return blocked;
  const form = await request.formData().catch(() => null);
  const given = form?.get('password');
  if (typeof given !== 'string' || given.length > GATE_PASSWORD_MAX_LENGTH) return page(401, TEXTS.wrong);
  const [isAdmin, isUser] = await Promise.all([verifyPassword(given, credentials.admin), verifyPassword(given, credentials.user)]);
  const role: GateRole | null = isAdmin ? 'admin' : isUser ? 'user' : null;
  if (!role) return page(401, TEXTS.wrong);
  return redirect('/', sessionCookie(new URL(request.url), await sessionValue(env, role, now)));
}

async function setup(request: Request, env: Env, options: GateOptions): Promise<Response> {
  const now = options.now();
  const existing = await loadCredentials(options);
  if (existing === 'unavailable') return page(503, TEXTS.unavailable, {}, true);
  if (existing !== null) return redirect('/gate');
  const blocked = await guardForm(request, env, options, 'gate-setup', true);
  if (blocked) return blocked;
  const form = await request.formData().catch(() => null);
  const field = (name: string): string => {
    const value = form?.get(name);
    return typeof value === 'string' ? value : '';
  };
  const [admin, admin2, user, user2] = [field('admin'), field('admin2'), field('user'), field('user2')];
  if (admin.length < GATE_PASSWORD_MIN_LENGTH || user.length < GATE_PASSWORD_MIN_LENGTH) return page(400, TEXTS.tooShort, {}, true);
  if (admin.length > GATE_PASSWORD_MAX_LENGTH || user.length > GATE_PASSWORD_MAX_LENGTH) return page(400, TEXTS.tooLong, {}, true);
  if (admin !== admin2 || user !== user2) return page(400, TEXTS.mismatch, {}, true);
  if (admin === user) return page(400, TEXTS.same, {}, true);
  const [adminRecord, userRecord] = await Promise.all([hashPassword(admin), hashPassword(user)]);
  let created: boolean;
  try {
    created = await options.store.create({ admin: adminRecord, user: userRecord });
  } catch {
    return page(503, TEXTS.unavailable, {}, true);
  }
  // Somebody else was faster: their passwords stand.
  if (!created) return redirect('/gate');
  return redirect('/', sessionCookie(new URL(request.url), await sessionValue(env, 'admin', now)));
}

/**
 * `null`: the request may pass to the site. A response: the gate answers itself.
 */
export async function handleGate(request: Request, env: Env, options: GateOptions): Promise<Response | null> {
  if (env.SITE_GATE !== 'password') return null;
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (path === '/api/v1/health') return null;
  // Fail-closed: a gate without signing key never opens the site.
  if (!env.SIGNING_KEY) return page(503, TEXTS.closed);
  const role = await gateRole(request, env, options.now());
  if (request.method === 'POST' && path === '/gate/login') return login(request, env, options);
  if (request.method === 'POST' && path === '/gate/setup') return setup(request, env, options);
  if (path === '/gate') {
    if (role) return redirect('/');
    const credentials = await loadCredentials(options);
    if (credentials === 'unavailable') return page(503, TEXTS.unavailable);
    return page(200, null, {}, credentials === null);
  }
  if (path === '/gate/login' || path === '/gate/setup') return redirect('/gate');
  if (role) return null;
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Bitte melde dich an.' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return request.method === 'GET' || request.method === 'HEAD' ? redirect('/gate') : page(401, null);
}
