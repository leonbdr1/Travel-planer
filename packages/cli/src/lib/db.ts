// CLI database access: the running local database (npm run dev / db:local)
// over the wire protocol if it listens, otherwise the local PGlite data
// directory directly (never both: PGlite is single-process).
import { createConnection } from 'node:net';
import { createPostgresDb, type Db } from '@reiseplaner/db';
import { createPglite, DEFAULT_LOCAL_DB_PORT, localDataDir, migrate, pgliteDb } from '@reiseplaner/db/node';

function listening(port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => done(false));
  });
}

export async function openCliDb(): Promise<{ db: Db; via: string }> {
  if (process.env.DATABASE_URL) {
    return { db: createPostgresDb(process.env.DATABASE_URL, { max: 1 }), via: 'DATABASE_URL' };
  }
  const port = Number(process.env.DB_PORT ?? DEFAULT_LOCAL_DB_PORT);
  if (await listening(port)) {
    return { db: createPostgresDb(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`, { max: 1 }), via: `127.0.0.1:${port}` };
  }
  const pg = await createPglite({ dataDir: process.env.REISEPLANER_CLI_DATA_DIR ?? localDataDir });
  const db = pgliteDb(pg);
  await migrate(db);
  return { db, via: process.env.REISEPLANER_CLI_DATA_DIR ? 'temporary PGlite' : '.data/pglite' };
}
