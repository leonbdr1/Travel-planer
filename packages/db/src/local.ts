// Local development database: persistent PGlite in `.data/pglite`, migrated
// on start and served over the Postgres wire protocol so the Worker reaches
// it through the Hyperdrive `localConnectionString` (architektur.md 13).
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import type { PGlite } from '@electric-sql/pglite';
import type { Db } from './db';
import { migrate } from './migrate';
import { createPglite, pgliteDb } from './pglite';
import { DEFAULT_LOCAL_DB_PORT, localDataDir } from './paths';
import { startSerialProxy } from './serial-proxy';

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
  // The socket server listens on a private port; clients reach it one at a
  // time through the serial proxy on the public port (see serial-proxy.ts).
  const server = new PGLiteSocketServer({ db: pg, port: 0, host: '127.0.0.1', maxConnections: 16 });
  await server.start();
  const internalPort = Number(server.getServerConn().split(':').pop());
  const proxy = await startSerialProxy({ host: '127.0.0.1', port, targetPort: internalPort });
  const connectionString = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  log(`db:local: listening on 127.0.0.1:${port}`);
  return {
    pg,
    db,
    port,
    connectionString,
    async stop() {
      await proxy.close();
      // Let the socket server finish its close handlers before PGlite shuts down.
      await new Promise((r) => setTimeout(r, 100));
      await server.stop();
      await pg.close();
    },
  };
}
