// PGlite (Postgres in WebAssembly) for tests, the CLI and local development.
// Node-only entry point: the Worker never imports this module.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgtap } from '@electric-sql/pglite-pgtap';
import { normalizeParams, type Db, type Queryable, type Row, type SqlValue } from './db';

export interface CreatePgliteOptions {
  /** Persistent data directory; in-memory when omitted. */
  dataDir?: string;
  /** Load the pgTAP extension (tests only). */
  withPgtap?: boolean;
}

export async function createPglite(options: CreatePgliteOptions = {}): Promise<PGlite> {
  const extensions = options.withPgtap ? { pg_trgm, pgtap } : { pg_trgm };
  if (options.dataDir) mkdirSync(dirname(options.dataDir), { recursive: true });
  return PGlite.create({
    ...(options.dataDir ? { dataDir: options.dataDir } : {}),
    extensions,
  });
}

interface PgliteQueryable {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

async function run<T extends Row>(target: PgliteQueryable, text: string, params: readonly SqlValue[] = []): Promise<T[]> {
  const result = await target.query<T>(text, normalizeParams(params));
  return result.rows;
}

export function pgliteDb(pg: PGlite): Db {
  return {
    query: (text, params) => run(pg, text, params),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      return pg.transaction((tx) => fn({ query: (text, params) => run(tx, text, params) }));
    },
    async exec(script) {
      await pg.exec(script);
    },
    async close() {
      await pg.close();
    },
  };
}
