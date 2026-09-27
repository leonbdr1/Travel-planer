import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // postgres.js' Cloudflare socket polyfill (postgres/cf/polyfills.js) leaks
    // two rejections after the driver has already handled the event: the
    // reader loop after a regular close, and writer.ready when a connection
    // attempt fails (connection.js removes its listeners first). The queries
    // themselves reject correctly, so exactly these two messages are ignored.
    onUnhandledError(error) {
      const message = String((error as { message?: unknown }).message ?? '');
      if (message === 'Stream was cancelled.' || message.startsWith('proxy request failed')) return false;
      return undefined;
    },
    projects: [
      'packages/config',
      'packages/domain',
      'packages/db',
      'packages/providers',
      'packages/skills',
      'packages/contracts',
      'packages/cli',
      'packages/worker',
      'packages/worker/vitest.node.config.ts',
      'packages/web',
      'packages/ops-worker',
    ],
  },
});
