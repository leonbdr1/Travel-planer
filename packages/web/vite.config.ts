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
const product = parse(readFileSync(resolve(root, 'product.config.yaml'), 'utf8')) as { slug: string };

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
      config: { name: `${product.slug}-app` },
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
