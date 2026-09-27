import { defineProject } from 'vitest/config';

export default defineProject({
  test: { name: 'cli', environment: 'node', include: ['test/**/*.test.ts'], passWithNoTests: true, testTimeout: 60_000 },
});
