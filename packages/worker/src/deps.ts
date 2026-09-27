// Per-request dependencies. The database connection is opened lazily on first
// use (postgres.js over the Hyperdrive binding) and closed when the request
// ends, so routes that never touch the database never connect.
import { createPostgresDb, type Db } from '@reiseplaner/db';
import type { Env, RuntimeConfig } from './env';

export interface RequestDeps {
  env: Env;
  config: RuntimeConfig;
  db(): Db;
  now(): Date;
  /** Closes resources opened during the request. */
  dispose(): Promise<void>;
}

export type DbFactory = (env: Env) => Db;

export const hyperdriveDb: DbFactory = (env) =>
  createPostgresDb(env.HYPERDRIVE.connectionString, { max: 1, connectTimeoutS: 3 });

export function createRequestDeps(
  env: Env,
  config: RuntimeConfig,
  options: { dbFactory?: DbFactory; now?: () => Date } = {},
): RequestDeps {
  const factory = options.dbFactory ?? hyperdriveDb;
  let db: Db | undefined;
  return {
    env,
    config,
    db: () => (db ??= factory(env)),
    now: options.now ?? (() => new Date()),
    async dispose() {
      if (db) await db.close().catch(() => {});
      db = undefined;
    },
  };
}
