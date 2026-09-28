// Per-request dependencies. The database connection is opened lazily on first
// use (postgres.js over the Hyperdrive binding) and closed when the request
// ends, so routes that never touch the database never connect. Providers are
// selected by PROVIDERS_MODE; every outgoing call is counted and flushed into
// app.provider_usage at the end of the request.
import { createPostgresDb, UsageRecorder, type Db } from '@reiseplaner/db';
import { createProviders, type Providers } from '@reiseplaner/providers';
import { fakeResponders } from '@reiseplaner/skills';
import { sourceOverrides, type Env, type RuntimeConfig } from './env';

export interface RequestDeps {
  env: Env;
  config: RuntimeConfig;
  db(): Db;
  providers(): Providers;
  usage: UsageRecorder;
  now(): Date;
  /**
   * Flushes usage counters and closes resources opened during the request.
   * `awaitClose: false` starts closing the connection without waiting for it:
   * in Workflow steps postgres.js `end()` never settles (workerd then reports
   * the step as hung), but the socket must still be closed.
   */
  dispose(options?: { awaitClose?: boolean }): Promise<void>;
}

export type DbFactory = (env: Env) => Db;
export type ProvidersFactory = (config: RuntimeConfig, env: Env, usage: UsageRecorder, now: () => Date) => Providers;

export const hyperdriveDb: DbFactory = (env) =>
  createPostgresDb(env.HYPERDRIVE.connectionString, { max: 1, connectTimeoutS: 3 });

export const envProviders: ProvidersFactory = (config, env, usage, now) =>
  createProviders(
    {
      mode: config.PROVIDERS_MODE,
      sources: sourceOverrides(config),
      liteapi: { apiKey: env.LITEAPI_API_KEY, baseUrl: config.LITEAPI_BASE_URL, bookBaseUrl: config.LITEAPI_BOOK_BASE_URL },
      ors: { apiKey: env.ORS_API_KEY, baseUrl: config.ORS_BASE_URL },
      overpass: { baseUrl: config.OVERPASS_BASE_URL },
      resend: { apiKey: env.RESEND_API_KEY },
      anthropic: { apiKey: env.ANTHROPIC_API_KEY },
    },
    {
      onCall: (provider, endpoint) => usage.record(provider, endpoint),
      now,
      fake: { latencyMs: config.FAKE_LATENCY_MS, failEvery: config.FAKE_FAIL_EVERY, llmResponders: fakeResponders },
    },
  );

export interface DepsOptions {
  dbFactory?: DbFactory;
  providersFactory?: ProvidersFactory;
  now?: () => Date;
}

export function createRequestDeps(env: Env, config: RuntimeConfig, options: DepsOptions = {}): RequestDeps {
  const dbFactory = options.dbFactory ?? hyperdriveDb;
  const providersFactory = options.providersFactory ?? envProviders;
  const now = options.now ?? (() => new Date());
  const usage = new UsageRecorder();
  let db: Db | undefined;
  let providers: Providers | undefined;
  return {
    env,
    config,
    usage,
    now,
    db: () => (db ??= dbFactory(env)),
    providers: () => (providers ??= providersFactory(config, env, usage, now)),
    async dispose(options = {}) {
      if (usage.total() > 0) {
        db ??= dbFactory(env);
        await usage.flush(db, now().toISOString().slice(0, 10)).catch((err: unknown) => {
          console.error(JSON.stringify({ level: 'warn', msg: 'usage flush failed', name: (err as Error).name }));
        });
      }
      if (db) {
        const closing = db.close().catch(() => {});
        if (options.awaitClose !== false) await closing;
      }
      db = undefined;
    },
  };
}
