// `npm run db:local`: persistent local database on 127.0.0.1:54329 (PGlite),
// migrated and seeded with development data.
import { startLocalDb } from '@reiseplaner/db/node';
import { seedDevData } from '../seed';

const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const local = await startLocalDb({
  ...(port ? { port } : {}),
  onReady: (db) => seedDevData(db, (line) => console.log(line)),
});
console.log(`db:local: ${local.connectionString}`);

const shutdown = async () => {
  await local.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
