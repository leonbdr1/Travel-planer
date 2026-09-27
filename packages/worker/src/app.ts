// Hono API under /api/v1 (architektur.md 7). Middleware order:
// security headers → body limit → per-request dependencies → routes.
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { CreateSearchRequest } from '@reiseplaner/contracts';
import { constants } from '@reiseplaner/domain';
import { createRequestDeps, type DbFactory, type ProvidersFactory, type RequestDeps } from './deps';
import { parseRuntimeConfig, ConfigurationError, type Env } from './env';
import { ApiError, errorBody, sendError } from './http/errors';
import { securityHeaders } from './http/security-headers';
import { geoRoutes } from './routes/geo';
import { healthRoutes } from './routes/health';
import { metaRoutes } from './routes/meta';
import { placeRoutes } from './routes/places';
import { resultRoutes } from './routes/results';
import { searchRoutes } from './routes/searches';
import { suggestionRoutes } from './routes/suggestions';
import { wishRoutes } from './routes/wishes';

export type AppEnv = { Bindings: Env; Variables: { deps: RequestDeps; searchRequest: CreateSearchRequest } };

export interface AppOptions {
  dbFactory?: DbFactory;
  providersFactory?: ProvidersFactory;
  now?: () => Date;
  version?: string;
}

declare const __GIT_SHA__: string | undefined;
const buildVersion = typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev';

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>().basePath('/api/v1');

  app.use('*', securityHeaders());
  app.use(
    '*',
    bodyLimit({
      maxSize: constants.REQUEST_BODY_LIMIT_BYTES,
      onError: (c) => c.json(errorBody('payload_too_large', 'Die Anfrage ist zu groß.'), 413),
    }),
  );
  app.use('*', async (c, next) => {
    const config = parseRuntimeConfig(c.env, options.version ?? buildVersion);
    const deps = createRequestDeps(c.env, config, {
      ...(options.dbFactory ? { dbFactory: options.dbFactory } : {}),
      ...(options.providersFactory ? { providersFactory: options.providersFactory } : {}),
      ...(options.now ? { now: options.now } : {}),
    });
    c.set('deps', deps);
    try {
      await next();
    } finally {
      await deps.dispose();
    }
  });

  app.route('/', healthRoutes);
  app.route('/meta', metaRoutes);
  app.route('/geo', geoRoutes);
  app.route('/suggestions', suggestionRoutes);
  app.route('/places', placeRoutes);
  app.route('/wishes', wishRoutes);
  app.route('/searches', searchRoutes);
  app.route('/searches', resultRoutes);

  app.notFound((c) => c.json(errorBody('not_found', 'Diese Adresse gibt es nicht.'), 404));
  app.onError((err, c) => {
    if (err instanceof ApiError) return sendError(c, err);
    if (err instanceof ConfigurationError) {
      console.error(JSON.stringify({ level: 'error', msg: 'configuration', paths: err.paths }));
      return c.json(errorBody('misconfigured', 'Der Dienst ist falsch konfiguriert.'), 500);
    }
    const dev = c.env.APP_ENV === 'dev' || c.env.APP_ENV === 'test';
    // Messages may carry data values; only local environments log them.
    console.error(
      JSON.stringify({ level: 'error', msg: 'unhandled', name: (err as Error).name, ...(dev ? { detail: String((err as Error).message).slice(0, 300) } : {}) }),
    );
    return c.json(errorBody('internal', 'Interner Fehler. Bitte versuche es später erneut.'), 500);
  });

  return app;
}
