// Booking endpoints (architektur.md 7.2, 10): POST /bookings (search token),
// confirm-price and complete (session token), GET and cancel (access token),
// access-link (ALTCHA and 5 per hour, always 202). Tokens travel in the
// X-Booking-Token header, never in URLs of API calls.
import { Hono, type Context } from 'hono';
import { productConfig } from '@reiseplaner/config';
import { accessLinkRequestSchema, bookingCreateRequestSchema, cancelRequestSchema } from '@reiseplaner/contracts';
import type { AppEnv } from '../app';
import { ConfigurationError } from '../env';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rate-limit';
import { parseJsonBody } from '../http/validate';
import { verifyAltcha } from '../services/altcha';
import { cancelBooking, completeBooking, confirmPrice, createBooking, requestAccessLink, viewBooking, type BookingDeps } from '../services/bookings';

const HOUR_S = 3600;

/** Public origin for links: the configured domain on staging and production, the request's origin locally. */
function publicOrigin(c: Context<AppEnv>): string {
  const env = c.get('deps').config.APP_ENV;
  if (env === 'production') return `https://${productConfig.domains.primary}`;
  if (env === 'staging') return `https://${productConfig.domains.staging}`;
  return new URL(c.req.url).origin;
}

function bookingDeps(c: Context<AppEnv>): BookingDeps {
  const deps = c.get('deps');
  const signingKey = deps.env.SIGNING_KEY;
  if (!signingKey) throw new ConfigurationError(['SIGNING_KEY']);
  return {
    db: deps.db(),
    liteapi: deps.providers().liteapi,
    mail: deps.providers().mail,
    now: deps.now,
    signingKey,
    origin: publicOrigin(c),
    paymentMode: deps.config.LITEAPI_PAYMENT_MODE,
    simulatedPayment: deps.config.PROVIDERS_MODE === 'fake',
    bookingEnabled: deps.config.BOOKING_ENABLED,
    randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
  };
}

function bookingToken(c: Context<AppEnv>): string {
  const token = c.req.header('x-booking-token') ?? '';
  if (token.length < 20) throw new ApiError(403, 'forbidden', 'Der Link ist ungültig oder abgelaufen.');
  return token;
}

export const bookingRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const req = await parseJsonBody(c, bookingCreateRequestSchema);
    return c.json(await createBooking(bookingDeps(c), req), 201);
  })
  .post(
    '/access-link',
    async (c, next) => {
      // Validation and ALTCHA come before the rate limit, as for searches.
      const req = await parseJsonBody(c, accessLinkRequestSchema);
      const secret = c.get('deps').env.ALTCHA_HMAC_KEY;
      if (!secret) throw new ConfigurationError(['ALTCHA_HMAC_KEY']);
      const check = await verifyAltcha(c.get('deps').db(), req.altcha, secret);
      if (!check.ok) throw new ApiError(400, 'altcha_invalid', 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.');
      c.set('accessLinkRequest', req);
      await next();
    },
    rateLimit('access-link', productConfig.limits.rate_limits.access_link_per_hour, HOUR_S),
    async (c) => {
      const req = c.get('accessLinkRequest');
      try {
        await requestAccessLink(bookingDeps(c), req.booking_ref, req.email);
      } catch (err) {
        // Always 202: the answer must not reveal whether a booking exists.
        console.error(JSON.stringify({ level: 'warn', msg: 'access link failed', name: (err as Error).name }));
      }
      return c.json({ accepted: true as const }, 202);
    },
  )
  .post('/:ref/confirm-price', async (c) => c.json(await confirmPrice(bookingDeps(c), c.req.param('ref'), bookingToken(c))))
  .post('/:ref/complete', async (c) => c.json(await completeBooking(bookingDeps(c), c.req.param('ref'), bookingToken(c))))
  .get('/:ref', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await viewBooking(bookingDeps(c), c.req.param('ref'), bookingToken(c)));
  })
  .post('/:ref/cancel', async (c) => {
    const { dry_run: dryRun } = await parseJsonBody(c, cancelRequestSchema);
    return c.json(await cancelBooking(bookingDeps(c), c.req.param('ref'), bookingToken(c), dryRun));
  });
