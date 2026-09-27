// Worker entry (wrangler.jsonc `main`): API under /api/*, everything else is
// served by the static assets binding (SPA).
import { createApp } from './app';
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
} satisfies ExportedHandler<Env>;
