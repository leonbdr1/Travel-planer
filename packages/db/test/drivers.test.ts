// Driver parity: the same SQL behaves identically through PGlite in-process
// and through postgres.js over the wire protocol (the Worker's path).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { json, type Db } from '../src/db';
import { createPostgresDb } from '../src/postgres';
import { startTestDbServer, type TestDbServer } from '../src/testing';

let server: TestDbServer;
let pgjs: Db;

beforeAll(async () => {
  server = await startTestDbServer();
  await server.db.exec(
    'CREATE TABLE app.driver_probe (id bigserial PRIMARY KEY, label text, tags text[], doc jsonb, day date, amount_cents integer);',
  );
  pgjs = createPostgresDb(server.connectionString, { max: 1 });
});
afterAll(async () => {
  await pgjs.close();
  await server.close();
});

const drivers = (): Array<[string, Db]> => [
  ['pglite', server.db],
  ['postgres.js', pgjs],
];

describe.each(['pglite', 'postgres.js'])('%s adapter', (name) => {
  const db = () => drivers().find(([n]) => n === name)![1];

  it('round-trips params, arrays, json text and dates', async () => {
    const [row] = await db().query<{ id: string | number; label: string; tags: string[]; doc: unknown; day: string }>(
      `INSERT INTO app.driver_probe (label, tags, doc, day, amount_cents)
       VALUES ($1, $2, $3::text::jsonb, $4, $5)
       RETURNING id, label, tags, doc, day::text AS day`,
      [`probe-${name}`, ['a', 'b'], json({ nested: { ok: true } }), '2026-10-02', 21200],
    );
    expect(row?.label).toBe(`probe-${name}`);
    expect(row?.tags).toEqual(['a', 'b']);
    expect(row?.doc).toEqual({ nested: { ok: true } });
    expect(row?.day).toBe('2026-10-02');
    expect(Number(row?.id)).toBeGreaterThan(0);
  });

  it('matches ANY($1) against a text array parameter', async () => {
    const rows = await db().query<{ label: string }>(
      'SELECT label FROM app.driver_probe WHERE label = ANY($1) ORDER BY label',
      [[`probe-${name}`]],
    );
    expect(rows.map((r) => r.label)).toEqual([`probe-${name}`]);
  });

  it('rolls back a failed transaction', async () => {
    await expect(
      db().transaction(async (tx) => {
        await tx.query('INSERT INTO app.driver_probe (label) VALUES ($1)', [`rollback-${name}`]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const rows = await db().query('SELECT 1 FROM app.driver_probe WHERE label = $1', [`rollback-${name}`]);
    expect(rows).toEqual([]);
  });
});
