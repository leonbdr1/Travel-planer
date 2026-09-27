// zod validation of JSON bodies and query strings with the uniform error format.
import type { Context } from 'hono';
import type { z } from 'zod';
import { ApiError } from './errors';

export async function parseJsonBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'Die Anfrage ist kein gültiges JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, 'invalid_request', 'Die Anfrage ist unvollständig oder ungültig.', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.infer<S> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new ApiError(400, 'invalid_request', 'Die Anfrage ist unvollständig oder ungültig.', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}
