// Security headers (architektur.md 11.1). API responses get a locked-down
// CSP; the SPA's HTML headers are generated from `spaSecurityHeaders` into
// the static assets' `_headers` file so both stay in one place.
import type { MiddlewareHandler } from 'hono';

export const baseSecurityHeaders: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const apiSecurityHeaders: Readonly<Record<string, string>> = {
  ...baseSecurityHeaders,
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store',
};

export const securityHeaders = (): MiddlewareHandler => async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(apiSecurityHeaders)) {
    if (!c.res.headers.has(name)) c.res.headers.set(name, value);
  }
};
