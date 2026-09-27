// `npm run db:local`: persistent local database on 127.0.0.1:54329 (PGlite).
import { startLocalDb } from '../local';

const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const local = await startLocalDb(port ? { port } : {});
console.log(`db:local: ${local.connectionString}`);

const shutdown = async () => {
  await local.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
