// Cron Triggers (architektur.md 6.12). Schedules mirror wrangler.jsonc
// `triggers.crons`; a test keeps both in sync. Every job is idempotent.
import { createRequestDeps, type DepsOptions } from './deps';
import { parseRuntimeConfig, type Env } from './env';
import { retryDueEmails } from './mail/outbox';

export const CRON_OUTBOX_RETRY = '*/10 * * * *';
export const CRON_SCHEDULES = [CRON_OUTBOX_RETRY] as const;

declare const __GIT_SHA__: string | undefined;

export async function runScheduled(cron: string, env: Env, options: DepsOptions = {}): Promise<Record<string, number>> {
  const config = parseRuntimeConfig(env, typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev');
  const deps = createRequestDeps(env, config, options);
  try {
    switch (cron) {
      case CRON_OUTBOX_RETRY: {
        const result = await retryDueEmails({ db: deps.db(), mail: deps.providers().mail, now: deps.now });
        console.log(JSON.stringify({ level: 'info', msg: 'cron outbox-retry', ...result }));
        return result;
      }
      default:
        console.error(JSON.stringify({ level: 'warn', msg: 'unknown cron schedule', cron }));
        return {};
    }
  } finally {
    await deps.dispose();
  }
}
