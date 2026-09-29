// Site gate (Ben, 2026-09-29): until the product goes public, the deployed site
// is reachable at its final URL but shows only a public page with a password
// form. After the login (cookie signed with SIGNING_KEY, bound to the password)
// the SPA and the API work as usual. Active with SITE_GATE=password; a missing
// secret closes the site (fail-closed). Public paths: the gate page, the login,
// robots.txt and the health check (watchdog, smoke test).
//
// Wrong attempts are limited per client through `limitAttempts` (database
// counter, fail-closed): 10 per 15 minutes.
import { productConfig } from '@reiseplaner/config';
import type { Env } from './env';
import { hashClient } from './http/client';
import { baseSecurityHeaders } from './http/security-headers';

export const GATE_COOKIE = 'rp_gate';
export const GATE_SESSION_DAYS = 30;
export const GATE_LOGIN_MAX_ATTEMPTS = 10;
export const GATE_LOGIN_WINDOW_S = 900;

export type AttemptResult = 'ok' | 'limited' | 'failed';

export interface GateOptions {
  now: () => Date;
  /** Counts one login attempt of `key`; `failed` when the counter is unreachable. */
  limitAttempts: (key: string, max: number, windowS: number) => Promise<AttemptResult>;
}

const enc = new TextEncoder();
const PUBLIC_PATHS = new Set(['/gate', '/gate/login', '/robots.txt', '/api/v1/health']);

const b64url = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

async function passwordMatches(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 1);
  return diff === 0;
}

async function sign(env: Env, expires: number): Promise<string> {
  const bound = b64url((await sha256(env.SITE_PASSWORD ?? '')).buffer as ArrayBuffer);
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SIGNING_KEY ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(`gate|${expires}|${bound}`)));
}

async function sessionValue(env: Env, now: Date): Promise<string> {
  const expires = Math.floor(now.getTime() / 1000) + GATE_SESSION_DAYS * 86_400;
  return `${expires}.${await sign(env, expires)}`;
}

async function hasSession(request: Request, env: Env, now: Date): Promise<boolean> {
  const cookie = request.headers.get('cookie') ?? '';
  const raw = cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${GATE_COOKIE}=`))
    ?.slice(GATE_COOKIE.length + 1);
  if (!raw) return false;
  const [expiresText, signature] = raw.split('.');
  const expires = Number(expiresText);
  if (!signature || !Number.isInteger(expires) || expires * 1000 < now.getTime()) return false;
  const expected = await sign(env, expires);
  return expected.length === signature.length && (await passwordMatches(signature, expected));
}

const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TEXTS = {
  title: (name: string) => `${name}: Zugang`,
  intro: (name: string) => `${name} ist eine Unterkunftssuche, die viele Orte und Termine auf einmal vergleicht. Das Produkt ist in Entwicklung und noch nicht öffentlich. Der Zugang ist derzeit nur mit Passwort möglich.`,
  label: 'Passwort',
  submit: 'Anmelden',
  wrong: 'Das Passwort stimmt nicht.',
  limited: 'Zu viele Versuche. Bitte warte einige Minuten.',
  unavailable: 'Die Anmeldung ist gerade nicht verfügbar. Bitte versuche es später noch einmal.',
  closed: 'Die Seite ist noch nicht freigeschaltet.',
  operator: (company: string) => `Betreiber: ${company}`,
  contact: 'Kontakt',
};

function page(status: number, message: string | null, extra: Record<string, string> = {}): Response {
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
<p>${esc(TEXTS.intro(name))}</p>
${message ? `<p class="err" role="alert">${esc(message)}</p>` : ''}
<form method="post" action="/gate/login">
<label for="pw">${esc(TEXTS.label)}</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">${esc(TEXTS.submit)}</button>
</form>
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

async function login(request: Request, env: Env, options: GateOptions): Promise<Response> {
  const now = options.now();
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin !== null && origin !== url.origin) return page(403, TEXTS.wrong);
  let key: string;
  try {
    key = `gate:${await hashClient(request, env.IP_HASH_SALT, env.APP_ENV, now)}`;
  } catch {
    return page(503, TEXTS.unavailable);
  }
  const attempt = await options.limitAttempts(key, GATE_LOGIN_MAX_ATTEMPTS, GATE_LOGIN_WINDOW_S);
  if (attempt === 'failed') return page(503, TEXTS.unavailable);
  if (attempt === 'limited') return page(429, TEXTS.limited, { 'Retry-After': String(GATE_LOGIN_WINDOW_S) });
  const form = await request.formData().catch(() => null);
  const given = form?.get('password');
  if (typeof given !== 'string' || !(await passwordMatches(given, env.SITE_PASSWORD ?? ''))) return page(401, TEXTS.wrong);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return redirect('/', {
    'Set-Cookie': `${GATE_COOKIE}=${await sessionValue(env, now)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GATE_SESSION_DAYS * 86_400}${secure}`,
  });
}

/**
 * `null`: the request may pass to the site. A response: the gate answers itself.
 */
export async function handleGate(request: Request, env: Env, options: GateOptions): Promise<Response | null> {
  if (env.SITE_GATE !== 'password') return null;
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (!env.SITE_PASSWORD || !env.SIGNING_KEY) {
    // Fail-closed: a gate without secret never opens the site.
    if (path === '/api/v1/health') return null;
    return page(503, TEXTS.closed);
  }
  if (path === '/api/v1/health') return null;
  const signedIn = await hasSession(request, env, options.now());
  if (path === '/gate/login' && request.method === 'POST') return login(request, env, options);
  if (path === '/gate') return signedIn ? redirect('/') : page(200, null);
  if (PUBLIC_PATHS.has(path) || signedIn) return null;
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Bitte melde dich an.' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return request.method === 'GET' || request.method === 'HEAD' ? redirect('/gate') : page(401, null);
}
