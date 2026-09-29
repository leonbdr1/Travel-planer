// Small runtime settings in app.meta_kv (e.g. the throttled maximum of
// combinations set by the look-to-book watch). Values are JSON and checked
// with zod by the caller.
import type { z } from 'zod';
import { json, type Queryable } from '../db';

export async function getSetting<S extends z.ZodType>(db: Queryable, key: string, schema: S): Promise<z.infer<S> | null> {
  const rows = await db.query<{ value: unknown }>('SELECT value::text AS value FROM app.meta_kv WHERE key = $1', [key]);
  const raw = rows[0]?.value;
  if (raw === undefined) return null;
  const parsed = schema.safeParse(typeof raw === 'string' ? JSON.parse(raw) : raw);
  return parsed.success ? parsed.data : null;
}

export async function setSetting(db: Queryable, key: string, value: unknown): Promise<void> {
  await db.query(
    `INSERT INTO app.meta_kv (key, value, updated_at) VALUES ($1, $2::text::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, json(value)],
  );
}

export async function deleteSetting(db: Queryable, key: string): Promise<void> {
  await db.query('DELETE FROM app.meta_kv WHERE key = $1', [key]);
}

/** Writes the value only if the key does not exist yet; false when it already did (atomic first write). */
export async function setSettingIfAbsent(db: Queryable, key: string, value: unknown): Promise<boolean> {
  const rows = await db.query<{ key: string }>(
    `INSERT INTO app.meta_kv (key, value, updated_at) VALUES ($1, $2::text::jsonb, now())
     ON CONFLICT (key) DO NOTHING RETURNING key`,
    [key, json(value)],
  );
  return rows.length > 0;
}
