// SPA build and local dev server. The Cloudflare plugin runs the Worker
// (packages/worker) inside workerd in the same process, so `npm run dev`
// serves SPA and API together (architektur.md 2.1).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const product = parse(readFileSync(resolve(root, 'product.config.yaml'), 'utf8')) as {
  slug: string;
  limits: { rate_limits: { coarse_per_minute: number } };
};
// Local namespace of the coarse rate limiter; staging and production
// declare their own RATE_LIMITER binding in wrangler.jsonc (O10.1).
const DEV_RATE_LIMIT_NAMESPACE = '1001';
// Local only: slow simulated providers, e.g. `REISEPLANER_FAKE_LATENCY_MS=4000
// npm run dev`, behave like the real LiteAPI in the Testbetrieb (a value in
// packages/worker/.dev.vars still wins).
const FAKE_LATENCY_MS = process.env.CLOUDFLARE_ENV ? undefined : process.env.REISEPLANER_FAKE_LATENCY_MS;

function gitSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      configPath: '../worker/wrangler.jsonc',
      // Product values enter the Worker config here (TENANT GUARD): the name,
      // and the coarse rate limit of architektur.md 11.1 (period 60 s).
      config: (worker) => {
        const coarse = { limit: product.limits.rate_limits.coarse_per_minute, period: 60 as const };
        const declared = worker.ratelimits.filter((r) => r.name === 'RATE_LIMITER');
        return {
          name: `${product.slug}-app`,
          ...(FAKE_LATENCY_MS ? { vars: { ...worker.vars, FAKE_LATENCY_MS } } : {}),
          ratelimits: declared.length
            ? worker.ratelimits.map((r) => (r.name === 'RATE_LIMITER' ? { ...r, simple: coarse } : r))
            : process.env.CLOUDFLARE_ENV
              ? worker.ratelimits
              : [{ name: 'RATE_LIMITER', namespace_id: DEV_RATE_LIMIT_NAMESPACE, simple: coarse }],
        };
      },
      ...(process.env.REISEPLANER_STATE_DIR ? { persistState: { path: process.env.REISEPLANER_STATE_DIR } } : {}),
      inspectorPort: false,
    }),
  ],
  define: {
    __GIT_SHA__: JSON.stringify(gitSha()),
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
  },
  build: {
    sourcemap: true,
  },
});
