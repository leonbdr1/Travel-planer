// Rate limits in two stages (architektur.md 11.1):
// 1. coarse: Workers Rate Limiting binding per Cloudflare location, for all
//    API routes but health; a missing binding (tests) or a binding error
//    lets the request through, because
// 2. binding: per-route limit via app.increment_rate_limit, atomic in the
//    database and fail-closed (RPC error → 503).
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { productConfig } from '@reiseplaner/config';
import { incrementRateLimit } from '@reiseplaner/db';
import type { AppEnv } from '../app';
import { clientHash } from './client';
import { ApiError } from './errors';

const MINUTE_S = 60;

function tooMany(max: number, windowS: number): ApiError {
  return new ApiError(429, 'rate_limited', 'Zu viele Anfragen. Bitte warte einen Moment.', { limit: max, window_s: windowS }, {
    'Retry-After': String(windowS),
  });
}

export function coarseRateLimit() {
  return createMiddleware<AppEnv>(async (c, next) => {
    const limiter = c.env.RATE_LIMITER;
    if (limiter && c.req.path !== '/api/v1/health') {
      const key = await clientHash(c);
      let allowed = true;
      try {
        allowed = (await limiter.limit({ key })).success;
      } catch (err) {
        console.error(JSON.stringify({ level: 'warn', msg: 'rate limiter binding failed', name: (err as Error).name }));
      }
      if (!allowed) throw tooMany(productConfig.limits.rate_limits.coarse_per_minute, MINUTE_S);
    }
    await next();
  });
}

/** `max` may depend on the request (e.g. higher limits in local dev). */
export function rateLimit(name: string, maxOf: number | ((c: Context<AppEnv>) => number), windowS: number) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const max = typeof maxOf === 'number' ? maxOf : maxOf(c);
    const key = `${name}:${await clientHash(c)}`;
    const result = await incrementRateLimit(c.get('deps').db(), key, max, windowS);
    if (result.failed) {
      throw new ApiError(503, 'unavailable', 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.');
    }
    if (!result.allowed) throw tooMany(max, windowS);
    await next();
  });
}
