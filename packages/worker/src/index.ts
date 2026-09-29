// Worker entry (wrangler.jsonc `main`): the site gate first (src/gate.ts, only
// with SITE_GATE=password), then the API under /api/*; everything else is
// served by the static assets binding (SPA); Cron Triggers run src/cron.ts.
import { getSetting, incrementRateLimit, setSettingIfAbsent } from '@reiseplaner/db';
import { z } from 'zod';
import { createApp } from './app';
import { runScheduled } from './cron';
import { createRequestDeps } from './deps';
import { parseRuntimeConfig, type Env } from './env';
import { gateRole, handleGate, ROLE_HEADER, type GateCredentials, type GateStore } from './gate';

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

const GATE_CREDENTIALS_KEY = 'gate.credentials';
const passwordRecord = z.object({ salt: z.string(), hash: z.string(), iterations: z.number().int().positive() });
const gateCredentials = z.object({ admin: passwordRecord, user: passwordRecord });

/** The gate passwords live in app.meta_kv (hashes only); a database error is passed on, not read as "not set up". */
function gateStore(env: Env): GateStore {
  const withDb = async <T>(use: (db: ReturnType<ReturnType<typeof createRequestDeps>['db']>) => Promise<T>): Promise<T> => {
    const deps = createRequestDeps(env, parseRuntimeConfig(env, typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev'));
    try {
      return await use(deps.db());
    } finally {
      await deps.dispose();
    }
  };
  return {
    load: () => withDb((db) => getSetting(db, GATE_CREDENTIALS_KEY, gateCredentials)) as Promise<GateCredentials | null>,
    create: (credentials) => withDb((db) => setSettingIfAbsent(db, GATE_CREDENTIALS_KEY, credentials)),
  };
}

export default {
  async fetch(request, env, ctx) {
    const now = () => new Date();
    const gated = await handleGate(request, env, { now, limitAttempts: (key, max, windowS) => limitAttempts(env, key, max, windowS), store: gateStore(env) });
    if (gated) return gated;
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      // The app learns the role from this header only; a client's own value never passes.
      const forwarded = new Request(request);
      forwarded.headers.delete(ROLE_HEADER);
      const role = await gateRole(request, env, now());
      if (role) forwarded.headers.set(ROLE_HEADER, role);
      return app.fetch(forwarded, env, ctx);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller.cron, env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
