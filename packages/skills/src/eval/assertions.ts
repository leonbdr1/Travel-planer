// Deterministic eval assertions (Frontlift eval format: JSONPath + operator).
import { z } from 'zod';
import { queryItems, queryPath } from './jsonpath';

export const assertionSchema = z.strictObject({
  path: z.string().startsWith('$'),
  op: z.enum([
    'equals',
    'set_equals',
    'contains',
    'not_contains',
    'every_in',
    'max_length',
    'count_eq',
    'count_lte',
    'count_gte',
    'matches',
    'not_matches',
    'absent',
    'present',
  ]),
  value: z.unknown().optional(),
  flags: z.string().regex(/^[imsu]*$/).optional(),
});
export type Assertion = z.infer<typeof assertionSchema>;

export const evalCaseSchema = z
  .strictObject({
    id: z.string().min(1),
    input: z.unknown(),
    expected: z.unknown().optional(),
    assertions: z.array(assertionSchema).optional(),
    judgeRubric: z.string().min(10).optional(),
    note: z.string().optional(),
  })
  .refine((c) => (c.assertions?.length ?? 0) > 0 || c.judgeRubric !== undefined, 'a case needs assertions or a judgeRubric');
export type EvalCase = z.infer<typeof evalCaseSchema>;

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const sortKey = (v: unknown) => JSON.stringify(v);

/** Returns null when the assertion holds, else a short failure text. */
export function checkAssertion(output: unknown, a: Assertion): string | null {
  const items = queryItems(output, a.path);
  const describe = `${a.path} ${a.op}${a.value === undefined ? '' : ` ${JSON.stringify(a.value)}`}`;
  const fail = (got: unknown) => `${describe} — erhalten: ${JSON.stringify(got)}`.slice(0, 300);
  switch (a.op) {
    case 'equals': {
      const values = queryPath(output, a.path);
      const got = /\[\*\]|\.\./.test(a.path) ? values : values[0];
      return deepEqual(got, a.value) ? null : fail(got);
    }
    case 'set_equals': {
      const want = Array.isArray(a.value) ? [...a.value].map(sortKey).sort() : [];
      const got = items.map(sortKey).sort();
      return deepEqual(got, want) ? null : fail(items);
    }
    case 'contains':
      return items.some((v) => deepEqual(v, a.value)) ? null : fail(items);
    case 'not_contains':
      return items.some((v) => deepEqual(v, a.value)) ? fail(items) : null;
    case 'every_in': {
      const allowed = Array.isArray(a.value) ? a.value.map(sortKey) : [];
      const bad = items.filter((v) => !allowed.includes(sortKey(v)));
      return bad.length === 0 ? null : fail(bad);
    }
    case 'max_length': {
      const max = Number(a.value);
      const bad = items.filter((v) => typeof v !== 'string' || [...v].length > max);
      return bad.length === 0 ? null : fail(bad);
    }
    case 'count_eq':
      return items.length === Number(a.value) ? null : fail(items.length);
    case 'count_lte':
      return items.length <= Number(a.value) ? null : fail(items.length);
    case 'count_gte':
      return items.length >= Number(a.value) ? null : fail(items.length);
    case 'matches':
    case 'not_matches': {
      const re = new RegExp(String(a.value), a.flags ?? '');
      const strings = items.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
      const ok = a.op === 'matches' ? strings.length > 0 && strings.every((s) => re.test(s)) : strings.every((s) => !re.test(s));
      return ok ? null : fail(strings.filter((s) => (a.op === 'matches' ? !re.test(s) : re.test(s))));
    }
    case 'absent':
      return queryPath(output, a.path).length === 0 ? null : fail(queryPath(output, a.path));
    case 'present':
      return queryPath(output, a.path).length > 0 ? null : fail([]);
  }
}
