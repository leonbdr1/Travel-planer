import type { Queryable } from '../db';

/** Health probe: the database answers and the schema is migrated. */
export async function pingDb(db: Queryable): Promise<boolean> {
  const rows = await db.query<{ initialized: boolean | null }>(
    "SELECT (value->>'initialized')::boolean AS initialized FROM app.meta_kv WHERE key = 'schema'",
  );
  return rows[0]?.initialized === true;
}
