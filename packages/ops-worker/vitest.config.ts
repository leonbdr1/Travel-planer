// Watchdog tests run inside workerd (@cloudflare/vitest-pool-workers) with
// the bindings of wrangler.jsonc (KV simulated by Miniflare). Outbound calls
// (health endpoint, Resend) go through an injected fetch: no network.
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [
    cloudflareTest(() => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { bindings: { OPS_ENV: 'test', OPS_HB_TOKEN: 'test-ops-token', RESEND_API_KEY: 'test-resend-key' } },
    })),
  ],
  test: { name: 'ops-worker', include: ['test/**/*.test.ts'], testTimeout: 30_000 },
});
