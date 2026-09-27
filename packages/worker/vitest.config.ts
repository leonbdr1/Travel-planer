// Worker tests run inside workerd (@cloudflare/vitest-pool-workers) with the
// real bindings from wrangler.jsonc. Hyperdrive points at a migrated PGlite
// served over the wire protocol by the global setup (hermetic: no network).
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineProject } from 'vitest/config';
import { testBindings } from './test/bindings';

export default defineProject({
  plugins: [
    cloudflareTest(({ inject }) => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        hyperdrives: { HYPERDRIVE: inject<string>('dbConnectionString') },
        bindings: testBindings,
      },
    })),
  ],
  define: { __GIT_SHA__: JSON.stringify('test-sha') },
  test: {
    name: 'worker',
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 30_000,
    // One PGlite instance serves every test file; files run one after another
    // so concurrent connections never exceed what the socket server handles.
    fileParallelism: false,
  },
});
