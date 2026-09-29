// Worker entry (wrangler.jsonc `main`): the site gate first (src/gate.ts, only
// with SITE_GATE=password), then the API under /api/*; everything else is
// served by the static assets binding (SPA); Cron Triggers run src/cron.ts.
import { incrementRateLimit } from '@reiseplaner/db';
import { createApp } from './app';
import { runScheduled } from './cron';
import { createRequestDeps } from './deps';
import { parseRuntimeConfig, type Env } from './env';
import { handleGate } from './gate';

export { SearchWorkflow } from './workflows/search';

const app = createApp();

declare const __GIT_SHA__: string | undefined;

/** Counts a login attempt in the database; any error counts as "not reachable" (fail-closed). */
async function limitAttempts(env: Env, key: string, max: number, windowS: number) {
  const deps = createRequestDeps(env, parseRuntimeConfig(env, typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev'));
  try {
    const result = await incrementRateLimit(deps.db(), key, max, windowS);
    return result.failed ? ('failed' as const) : result.allowed ? ('ok' as const) : ('limited' as const);
  } catch {
    return 'failed' as const;
  } finally {
    await deps.dispose();
  }
}

export default {
  async fetch(request, env, ctx) {
    const gated = await handleGate(request, env, { now: () => new Date(), limitAttempts: (key, max, windowS) => limitAttempts(env, key, max, windowS) });
    if (gated) return gated;
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller.cron, env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
