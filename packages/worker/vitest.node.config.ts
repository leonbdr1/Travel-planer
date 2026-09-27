// Node-side tests of the runtime-agnostic services (PGlite + provider fakes).
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'worker-node',
    environment: 'node',
    include: ['test-node/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
