// Minimal database port shared by the Worker (postgres.js over Hyperdrive),
// the CLI and the tests (PGlite). Repositories only use handwritten SQL with
// $n placeholders through this interface, so the same SQL runs on both.
//
// Conventions that keep both drivers identical:
// - JSON parameters are passed as JSON text and cast with `$n::text::jsonb`
//   (see `json()`); postgres.js would otherwise double-encode strings.
// - `date` columns are selected as `::text` (YYYY-MM-DD), numeric as
//   `::float8`, and bigint values are coerced with zod in the row schemas.

export type SqlValue =
  | string
  | number
  | boolean
  | null
  | Date
  | readonly string[]
  | readonly number[];

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T extends Row = Row>(text: string, params?: readonly SqlValue[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Runs `fn` inside a single transaction on one connection. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Executes a multi-statement script (migrations, seeds). No parameters. */
  exec(script: string): Promise<void>;
  close(): Promise<void>;
}

/** Serialises a value for a `$n::text::jsonb` parameter. */
export function json(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Encodes a JS array as a Postgres array literal. postgres.js runs with
 * `fetch_types: false` (Hyperdrive recommendation) and then cannot serialise
 * arrays itself; the server parses the literal using the parameter's type.
 */
export function toPgArrayLiteral(values: readonly (string | number)[]): string {
  const items = values.map((v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${items.join(',')}}`;
}

/** Parses a one-dimensional Postgres array literal such as `{a,"b c",NULL}`. */
export function parsePgArrayLiteral(literal: string): Array<string | null> {
  if (literal === '{}') return [];
  const body = literal.slice(1, -1);
  const out: Array<string | null> = [];
  let i = 0;
  while (i <= body.length) {
    if (body[i] === '"') {
      let value = '';
      i += 1;
      while (i < body.length && body[i] !== '"') {
        if (body[i] === '\\') i += 1;
        value += body[i] ?? '';
        i += 1;
      }
      out.push(value);
      i += 2; // closing quote and comma
    } else {
      const end = body.indexOf(',', i);
      const raw = end === -1 ? body.slice(i) : body.slice(i, end);
      out.push(raw === 'NULL' ? null : raw);
      i = end === -1 ? body.length + 1 : end + 1;
    }
  }
  return out;
}

export function normalizeParams(params: readonly SqlValue[] = []): unknown[] {
  return params.map((p) => (Array.isArray(p) ? toPgArrayLiteral(p as readonly (string | number)[]) : p));
}

export class DbUnavailableError extends Error {
  constructor(cause: unknown) {
    super('database unavailable', { cause });
    this.name = 'DbUnavailableError';
  }
}
