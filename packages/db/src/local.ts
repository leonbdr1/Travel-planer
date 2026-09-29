// Local development database: persistent PGlite in `.data/pglite`, migrated
// on start and served over the Postgres wire protocol so the Worker reaches
// it through the Hyperdrive `localConnectionString` (architektur.md 13).
import type { PGlite } from '@electric-sql/pglite';
import type { Db } from './db';
import { migrate } from './migrate';
import { createPglite, pgliteDb } from './pglite';
import { DEFAULT_LOCAL_DB_PORT, localDataDir } from './paths';
import { startPgliteWireServer } from './wire-server';

export interface LocalDbOptions {
  port?: number;
  dataDir?: string;
  /** Called after migrations, e.g. to seed development data. */
  onReady?: (db: Db) => Promise<void>;
  log?: (message: string) => void;
}

export interface LocalDb {
  pg: PGlite;
  db: Db;
  port: number;
  connectionString: string;
  stop(): Promise<void>;
}

export async function startLocalDb(options: LocalDbOptions = {}): Promise<LocalDb> {
  const log = options.log ?? ((message: string) => console.log(message));
  const port = options.port ?? DEFAULT_LOCAL_DB_PORT;
  const pg = await createPglite({ dataDir: options.dataDir ?? localDataDir });
  const db = pgliteDb(pg);
  const { applied } = await migrate(db);
  log(`db:local: ${applied.length ? `applied ${applied.join(', ')}` : 'schema up to date'}`);
  if (options.onReady) await options.onReady(db);
  // Clients share PGlite's one session chunk by chunk (see wire-server.ts).
  const server = await startPgliteWireServer(pg, { host: '127.0.0.1', port, log });
  const connectionString = `postgres://postgres:postgres@127.0.0.1:${server.port}/postgres`;
  log(`db:local: listening on 127.0.0.1:${server.port}`);
  return {
    pg,
    db,
    port: server.port,
    connectionString,
    async stop() {
      await server.close();
      await pg.close();
    },
  };
}
