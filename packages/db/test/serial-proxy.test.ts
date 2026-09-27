// Concurrent clients through the serial proxy: no interleaved protocol
// messages in the single PGlite session.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresDb } from '../src/postgres';
import { startTestDbServer, type TestDbServer } from '../src/testing';

let server: TestDbServer;
beforeAll(async () => {
  server = await startTestDbServer();
}, 60_000);
afterAll(async () => server.close());

describe('serial proxy in front of PGlite', () => {
  it('serves concurrent connections with different statements correctly', async () => {
    const run = async (i: number) => {
      const db = createPostgresDb(server.connectionString, { max: 1 });
      try {
        const [a] = await db.query<{ v: number }>('SELECT $1::int + 1 AS v', [i]);
        const [b] = await db.query<{ ok: boolean }>('SELECT $1::boolean AS ok', [i % 2 === 0]);
        const [c] = await db.query<{ t: string }>('SELECT $1::text || $2::text AS t', [`x${i}`, 'y']);
        return [a?.v, b?.ok, c?.t];
      } finally {
        await db.close();
      }
    };
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => run(i)));
    expect(results).toEqual(Array.from({ length: 12 }, (_, i) => [i + 1, i % 2 === 0, `x${i}y`]));
  }, 60_000);
});
