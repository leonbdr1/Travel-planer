// Per-client rate limit via app.increment_rate_limit (architektur.md 7.1):
// binding-free, atomic in the database and fail-closed (RPC error → 503).
import { createMiddleware } from 'hono/factory';
import { incrementRateLimit } from '@reiseplaner/db';
import type { AppEnv } from '../app';
import { clientHash } from './client';
import { ApiError } from './errors';

export function rateLimit(name: string, max: number, windowS: number) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = `${name}:${await clientHash(c)}`;
    const result = await incrementRateLimit(c.get('deps').db(), key, max, windowS);
    if (result.failed) {
      throw new ApiError(503, 'unavailable', 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.');
    }
    if (!result.allowed) {
      throw new ApiError(429, 'rate_limited', 'Zu viele Anfragen. Bitte warte einen Moment.', { limit: max, window_s: windowS }, {
        'Retry-After': String(windowS),
      });
    }
    await next();
  });
}
