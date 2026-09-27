// Uniform error format (architektur.md 7.1):
// {"error": {"code": "...", "message": "<deutscher Text>", "details": {...}}}
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorBody(code: string, message: string, details?: Record<string, unknown>): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}

export function sendError(c: Context, err: ApiError): Response {
  if (err.headers) for (const [k, v] of Object.entries(err.headers)) c.header(k, v);
  return c.json(errorBody(err.code, err.message, err.details), err.status);
}
