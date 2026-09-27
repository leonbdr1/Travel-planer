// Worker entry (wrangler.jsonc `main`): API under /api/*, everything else is
// served by the static assets binding (SPA); Cron Triggers run src/cron.ts.
import { createApp } from './app';
import { runScheduled } from './cron';
import type { Env } from './env';

export { SearchWorkflow } from './workflows/search';

const app = createApp();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller.cron, env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
