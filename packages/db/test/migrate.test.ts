import { afterEach, describe, expect, it } from 'vitest';
import { listMigrations, migrate } from '../src/migrate';
import { createPglite, pgliteDb } from '../src/pglite';
import type { PGlite } from '@electric-sql/pglite';

let pg: PGlite | undefined;
afterEach(async () => {
  await pg?.close();
  pg = undefined;
});

describe('migrations', () => {
  it('follow the naming convention and each has a _VERIFY companion', async () => {
    const { readdirSync } = await import('node:fs');
    const { migrationsDir } = await import('../src/migrate');
    const files = readdirSync(migrationsDir);
    const migrations = listMigrations();
    expect(migrations.length).toBeGreaterThan(0);
    for (const m of migrations) {
      expect(files).toContain(`${m.version}_${m.name}_VERIFY.sql.notrun`);
    }
    const unexpected = files.filter(
      (f) => !/^\d{8}[a-z]_[a-z0-9_]+(\.sql|_VERIFY\.sql\.notrun)$/.test(f),
    );
    expect(unexpected).toEqual([]);
  });

  it('apply once and are recorded; a second run applies nothing', async () => {
    pg = await createPglite();
    const db = pgliteDb(pg);
    const first = await migrate(db);
    expect(first.applied.length).toBe(listMigrations().length);
    const second = await migrate(db);
    expect(second.applied).toEqual([]);
  });

  it('are idempotent when a file is executed twice', async () => {
    pg = await createPglite();
    const db = pgliteDb(pg);
    for (const m of listMigrations()) {
      await db.exec(m.sql);
      await db.exec(m.sql);
    }
    const rows = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM app.meta_kv');
    expect(rows[0]?.n).toBeGreaterThan(0);
  });
});
