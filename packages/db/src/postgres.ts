// postgres.js adapter. In the Worker the connection string comes from the
// Hyperdrive binding (caching disabled, architektur.md E2); in Node it points
// at a Postgres or at the local PGlite socket.
import postgres from 'postgres';
import {
  normalizeParams,
  parsePgArrayLiteral,
  toPgArrayLiteral,
  type Db,
  type Queryable,
  type Row,
  type SqlValue,
} from './db';

export interface PostgresDbOptions {
  /** Pool size; 1 in tests and per Worker request. */
  max?: number;
  connectTimeoutS?: number;
  idleTimeoutS?: number;
}

type Params = postgres.ParameterOrJSON<never>[];

// With `fetch_types: false` postgres.js does not know array OIDs, so array
// results would arrive as raw literals. These parsers restore parity with
// PGlite for the array types the schema uses.
const asLiteral = (value: unknown): string =>
  typeof value === 'string' ? value : toPgArrayLiteral(value as (string | number)[]);
const arrayTypes = {
  text_array: { to: 1009, from: [1009, 1015], serialize: asLiteral, parse: (s: string) => parsePgArrayLiteral(s) },
  int_array: {
    to: 1007,
    from: [1005, 1007, 1016],
    serialize: asLiteral,
    parse: (s: string) => parsePgArrayLiteral(s).map((v) => (v === null ? null : Number(v))),
  },
  float_array: {
    to: 1022,
    from: [1021, 1022],
    serialize: asLiteral,
    parse: (s: string) => parsePgArrayLiteral(s).map((v) => (v === null ? null : Number(v))),
  },
};

export function createPostgresDb(connectionString: string, options: PostgresDbOptions = {}): Db {
  const sql = postgres(connectionString, {
    max: options.max ?? 1,
    connect_timeout: options.connectTimeoutS ?? 5,
    idle_timeout: options.idleTimeoutS ?? 10,
    // Hyperdrive recommendation: skip the extra type-discovery round trip.
    fetch_types: false,
    prepare: true,
    onnotice: () => {},
    types: arrayTypes,
  });

  const run = async <T extends Row>(
    target: postgres.Sql | postgres.TransactionSql,
    text: string,
    params: readonly SqlValue[] = [],
  ): Promise<T[]> => {
    const rows = await target.unsafe(text, normalizeParams(params) as Params);
    return Array.from(rows) as unknown as T[];
  };

  return {
    query: (text, params) => run(sql, text, params),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      const result = await sql.begin((tx) => fn({ query: (text, params) => run(tx, text, params) }));
      return result as T;
    },
    async exec(script) {
      await sql.unsafe(script).simple();
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
