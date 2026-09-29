// Hermetic test helpers: fresh, migrated in-memory PGlite instances (no
// network, no Docker, no secrets). The first instance is migrated once and
// snapshotted; later instances start from the snapshot, which keeps many
// small DB tests fast.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgtap } from '@electric-sql/pglite-pgtap';
import type { Db } from './db';
import { migrate } from './migrate';
import { pgliteDb } from './pglite';
import { startPgliteWireServer } from './wire-server';

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

/** Migrated PGlite behind a Postgres wire-protocol server (random port, see wire-server.ts). */
export async function startTestDbServer(): Promise<TestDbServer> {
  const test = await createTestDb();
  const server = await startPgliteWireServer(test.pg, { host: '127.0.0.1', port: 0 });
  return {
    ...test,
    port: server.port,
    connectionString: `postgres://postgres:postgres@127.0.0.1:${server.port}/postgres`,
    async close() {
      await server.close();
      await test.pg.close();
    },
  };
}
