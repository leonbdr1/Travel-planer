// Migration runner for the single migration tree `supabase/migrations/`
// (architektur.md 5.1). Production applies the same files with
// `supabase db push`; this runner serves tests, CLI and local development and
// records applied versions in the same table Supabase uses.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Db } from './db';
import { repoRoot } from './paths';

export const migrationsDir = resolve(repoRoot, 'supabase/migrations');
export const pgtapDir = resolve(repoRoot, 'supabase/tests');

const MIGRATION_FILE = /^(\d{8}[a-z])_([a-z0-9_]+)\.sql$/;

export interface MigrationFile {
  version: string;
  name: string;
  path: string;
  sql: string;
}

export function listMigrations(dir: string = migrationsDir): MigrationFile[] {
  return readdirSync(dir)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort()
    .map((file) => {
      const match = MIGRATION_FILE.exec(file);
      if (!match?.[1] || !match[2]) throw new Error(`unexpected migration file name: ${file}`);
      const path = join(dir, file);
      return { version: match[1], name: match[2], path, sql: readFileSync(path, 'utf8') };
    });
}

export async function migrate(db: Db, dir: string = migrationsDir): Promise<{ applied: string[] }> {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      name text,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const done = new Set(
    (await db.query<{ version: string }>('SELECT version FROM supabase_migrations.schema_migrations')).map(
      (row) => row.version,
    ),
  );
  const applied: string[] = [];
  for (const migration of listMigrations(dir)) {
    if (done.has(migration.version)) continue;
    await db.exec(`BEGIN;\n${migration.sql}\nCOMMIT;`).catch(async (err: unknown) => {
      await db.exec('ROLLBACK;').catch(() => {});
      throw new Error(`migration ${migration.version}_${migration.name} failed: ${(err as Error).message}`, {
        cause: err,
      });
    });
    await db.query('INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)', [
      migration.version,
      migration.name,
    ]);
    applied.push(`${migration.version}_${migration.name}`);
  }
  return { applied };
}
