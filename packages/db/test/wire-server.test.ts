// Clients sharing PGlite's one session through the wire server: statements
// never mix, transactions stay whole, and a connection that sits idle (a
// Worker step waiting for LiteAPI) no longer blocks the others (Ben's test on
// 2026-09-29: CONNECT_TIMEOUT during the search).
import { connect } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresDb } from '../src/postgres';
import { startTestDbServer, type TestDbServer } from '../src/testing';

let server: TestDbServer;
beforeAll(async () => {
  server = await startTestDbServer();
  await server.db.query('CREATE TABLE IF NOT EXISTS app.wire_test (n int)');
}, 60_000);
afterAll(async () => server.close());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A raw client: startup, then simple queries; closes without Terminate. */
async function rawClient(port: number) {
  const socket = connect({ host: '127.0.0.1', port });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  let received = Buffer.alloc(0);
  socket.on('data', (d: Buffer) => (received = Buffer.concat([received, d])));
  const readyCount = () => {
    let n = 0;
    for (let i = 0; i + 5 <= received.length; ) {
      if (received[i] === 0x5a) n += 1;
      i += 1 + received.readInt32BE(i + 1);
    }
    return n;
  };
  const waitReady = async (count: number) => {
    for (let i = 0; i < 200 && readyCount() < count; i += 1) await sleep(10);
    expect(readyCount()).toBeGreaterThanOrEqual(count);
  };
  const params = Buffer.from('user\0postgres\0database\0postgres\0\0', 'utf8');
  const startup = Buffer.alloc(8);
  startup.writeInt32BE(8 + params.length, 0);
  startup.writeInt32BE(196608, 4);
  socket.write(Buffer.concat([startup, params]));
  await waitReady(1);
  let expected = 1;
  return {
    async query(sql: string) {
      const text = Buffer.from(`${sql}\0`, 'utf8');
      const header = Buffer.alloc(5);
      header[0] = 0x51;
      header.writeInt32BE(4 + text.length, 1);
      socket.write(Buffer.concat([header, text]));
      expected += 1;
      await waitReady(expected);
    },
    destroy: () => socket.destroy(),
  };
}

describe('PGlite wire server', () => {
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

  it('lets others in while a connection sits idle between queries (a step waiting for a provider)', async () => {
    const step = createPostgresDb(server.connectionString, { max: 1, idleTimeoutS: 30 });
    const poll = createPostgresDb(server.connectionString, { max: 1, connectTimeoutS: 1 });
    try {
      await step.query('SELECT 1');
      // The step keeps its connection open for 1.5 s ("LiteAPI call"); the serial
      // proxy before made every other connection wait for it and time out.
      const waiting = sleep(1500).then(() => step.query<{ v: number }>('SELECT 2 AS v'));
      const started = Date.now();
      const [row] = await poll.query<{ v: number }>('SELECT 3 AS v');
      expect(row?.v).toBe(3);
      expect(Date.now() - started).toBeLessThan(1000);
      expect((await waiting)[0]?.v).toBe(2);
    } finally {
      await Promise.all([step.close(), poll.close()]);
    }
  }, 30_000);

  it('keeps transactions whole: others wait until the commit and never see half of it', async () => {
    await server.db.query('DELETE FROM app.wire_test');
    const writer = createPostgresDb(server.connectionString, { max: 1 });
    const reader = createPostgresDb(server.connectionString, { max: 1 });
    try {
      let committedAt = 0;
      const tx = writer.transaction(async (t) => {
        await t.query('INSERT INTO app.wire_test (n) VALUES (1)');
        await sleep(300);
        await t.query('INSERT INTO app.wire_test (n) VALUES (2)');
      });
      await sleep(100);
      const read = reader.query<{ c: number }>('SELECT count(*)::int AS c FROM app.wire_test').then((rows) => ({ rows, at: Date.now() }));
      await tx.then(() => (committedAt = Date.now()));
      const { rows, at } = await read;
      expect(rows[0]?.c).toBe(2);
      expect(at).toBeGreaterThanOrEqual(committedAt - 50);
    } finally {
      await Promise.all([writer.close(), reader.close()]);
    }
  }, 30_000);

  it('rolls back the open transaction of a client that disconnects, and serves the next one', async () => {
    await server.db.query('DELETE FROM app.wire_test');
    const gone = await rawClient(server.port);
    await gone.query('BEGIN');
    await gone.query('INSERT INTO app.wire_test (n) VALUES (7)');
    gone.destroy();
    const next = createPostgresDb(server.connectionString, { max: 1, connectTimeoutS: 2 });
    try {
      const [row] = await next.query<{ c: number }>('SELECT count(*)::int AS c FROM app.wire_test');
      expect(row?.c).toBe(0);
      expect(server.pg.isInTransaction()).toBe(false);
    } finally {
      await next.close();
    }
  }, 30_000);
});
