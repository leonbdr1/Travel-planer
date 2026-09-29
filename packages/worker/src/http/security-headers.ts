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

/**
 * CSP of the SPA: own origin only; images also from https (hotel photos of
 * the provider). The LiteAPI payment SDK (liteAPIPayment.js) fetches its
 * config from payment-wrapper.liteapi.travel and mounts Stripe's payment
 * element (js.stripe.com script, api.stripe.com, framed hooks.stripe.com for
 * 3-D Secure); checked against the SDK files on 2026-09-29.
 */
const PAYMENT_SDK_HOST = 'https://payment-wrapper.liteapi.travel';
const STRIPE_SCRIPT_HOST = 'https://js.stripe.com';
export const spaContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${PAYMENT_SDK_HOST} ${STRIPE_SCRIPT_HOST}`,
  "style-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self' ${PAYMENT_SDK_HOST} https://api.stripe.com`,
  `frame-src ${STRIPE_SCRIPT_HOST} https://hooks.stripe.com`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const spaSecurityHeaders: Readonly<Record<string, string>> = {
  ...baseSecurityHeaders,
  'Content-Security-Policy': spaContentSecurityPolicy,
};

/** Content of packages/web/public/_headers (static assets; a test keeps it in sync). */
export function renderHeadersFile(): string {
  const lines = [
    '# Generated from packages/worker/src/http/security-headers.ts (spaSecurityHeaders); a test keeps both in sync.',
    '/*',
    ...Object.entries(spaSecurityHeaders).map(([k, v]) => `  ${k}: ${v}`),
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ];
  return lines.join('\n');
}

export const securityHeaders = (): MiddlewareHandler => async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(apiSecurityHeaders)) {
    if (!c.res.headers.has(name)) c.res.headers.set(name, value);
  }
};
