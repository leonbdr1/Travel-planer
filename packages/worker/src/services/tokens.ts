// Booking tokens (architektur.md 10): HMAC-SHA256 over booking id, purpose,
// expiry (and for access tokens a hash of the holder's e-mail) with
// SIGNING_KEY, via Web Crypto. Format: base64url(JSON claims).base64url(MAC).
// Tokens are never logged.
export type TokenPurpose = 'session' | 'access';

interface Claims {
  b: string;
  p: TokenPurpose;
  e: number;
  h?: string;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Short hash of the holder's e-mail for access tokens (no e-mail in the token). */
export async function emailHash(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(email.trim().toLowerCase()));
  return b64url(new Uint8Array(digest)).slice(0, 22);
}

export async function signToken(secret: string, claims: { bookingId: string; purpose: TokenPurpose; expiresAt: Date; emailHash?: string }): Promise<string> {
  const payload: Claims = { b: claims.bookingId, p: claims.purpose, e: Math.floor(claims.expiresAt.getTime() / 1000), ...(claims.emailHash ? { h: claims.emailHash } : {}) };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(mac)}`;
}

export type TokenCheck = { ok: true; bookingId: string; emailHash: string | null } | { ok: false; reason: 'malformed' | 'signature' | 'purpose' | 'expired' };

/** Verifies signature (constant time via Web Crypto), purpose and expiry. */
export async function verifyToken(secret: string, token: string, purpose: TokenPurpose, now: Date): Promise<TokenCheck> {
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined || token.length > 1000) return { ok: false, reason: 'malformed' };
  let valid = false;
  try {
    valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(mac), enc.encode(body));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!valid) return { ok: false, reason: 'signature' };
  let claims: Claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Claims;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (claims.p !== purpose) return { ok: false, reason: 'purpose' };
  if (!Number.isFinite(claims.e) || claims.e * 1000 <= now.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, bookingId: claims.b, emailHash: claims.h ?? null };
}

/** Equality of two strings in time independent of where they differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
