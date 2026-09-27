import { defineProject } from 'vitest/config';

export default defineProject({
  test: { name: 'skills', environment: 'node', include: ['test/**/*.test.ts'], passWithNoTests: true, testTimeout: 60_000, hookTimeout: 60_000 },
});
