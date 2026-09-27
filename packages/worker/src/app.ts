// Hono API under /api/v1 (architektur.md 7). Middleware order:
// security headers → body limit → per-request dependencies → routes.
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { constants } from '@reiseplaner/domain';
import { createRequestDeps, type DbFactory, type RequestDeps } from './deps';
import { parseRuntimeConfig, ConfigurationError, type Env } from './env';
import { ApiError, errorBody, sendError } from './http/errors';
import { securityHeaders } from './http/security-headers';
import { healthRoutes } from './routes/health';
import { metaRoutes } from './routes/meta';

export type AppEnv = { Bindings: Env; Variables: { deps: RequestDeps } };

export interface AppOptions {
  dbFactory?: DbFactory;
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

  app.notFound((c) => c.json(errorBody('not_found', 'Diese Adresse gibt es nicht.'), 404));
  app.onError((err, c) => {
    if (err instanceof ApiError) return sendError(c, err);
    if (err instanceof ConfigurationError) {
      console.error(JSON.stringify({ level: 'error', msg: 'configuration', paths: err.paths }));
      return c.json(errorBody('misconfigured', 'Der Dienst ist falsch konfiguriert.'), 500);
    }
    console.error(JSON.stringify({ level: 'error', msg: 'unhandled', name: (err as Error).name }));
    return c.json(errorBody('internal', 'Interner Fehler. Bitte versuche es später erneut.'), 500);
  });

  return app;
}
