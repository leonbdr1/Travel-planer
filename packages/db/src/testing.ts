// Hermetic test helpers: fresh, migrated in-memory PGlite instances (no
// network, no Docker, no secrets). The first instance is migrated once and
// snapshotted; later instances start from the snapshot, which keeps many
// small DB tests fast.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgtap } from '@electric-sql/pglite-pgtap';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import type { Db } from './db';
import { migrate } from './migrate';
import { pgliteDb } from './pglite';

let snapshot: Promise<Blob> | undefined;

async function migratedSnapshot(): Promise<Blob> {
  snapshot ??= (async () => {
    const pg = await PGlite.create({ extensions: { pg_trgm, pgtap } });
    await migrate(pgliteDb(pg));
    const dump = await pg.dumpDataDir('none');
    await pg.close();
    return dump;
  })();
  return snapshot;
}

export interface TestDb {
  db: Db;
  pg: PGlite;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const pg = await PGlite.create({ loadDataDir: await migratedSnapshot(), extensions: { pg_trgm, pgtap } });
  return { db: pgliteDb(pg), pg, close: () => pg.close() };
}

export interface TestDbServer extends TestDb {
  port: number;
  connectionString: string;
}

/** Migrated PGlite behind a Postgres wire-protocol socket (random port). */
export async function startTestDbServer(): Promise<TestDbServer> {
  const test = await createTestDb();
  const server = new PGLiteSocketServer({ db: test.pg, port: 0, host: '127.0.0.1', maxConnections: 16 });
  await server.start();
  const port = Number(server.getServerConn().split(':').pop());
  return {
    ...test,
    port,
    connectionString: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    async close() {
      await server.stop();
      await test.pg.close();
    },
  };
}
