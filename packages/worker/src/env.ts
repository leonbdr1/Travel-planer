// Bindings and runtime configuration of the Worker (architektur.md 12).
// Vars are validated with zod on every request; secrets are only checked for
// presence here and never logged.
import { z } from 'zod';
import { providersModes } from '@reiseplaner/providers';

/** Structural subsets of the Workers binding types, so Node code (demos, CLI) can import the app. */
export interface HyperdriveBinding {
  connectionString: string;
}
export interface AssetsBinding {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

/** Structural subset of the Workflows binding (create and look up instances). */
export interface WorkflowBinding<P> {
  create(options?: { id?: string; params?: P }): Promise<{ id: string }>;
}

export interface Env {
  HYPERDRIVE: HyperdriveBinding;
  ASSETS?: AssetsBinding;
  SEARCH_WORKFLOW?: WorkflowBinding<{ searchId: string }>;
  APP_ENV: string;
  PROVIDERS_MODE: string;
  LLM_ENABLED: string;
  LITEAPI_BASE_URL: string;
  LITEAPI_BOOK_BASE_URL: string;
  LITEAPI_PAYMENT_MODE: string;
  ORS_BASE_URL: string;
  /** Fake mode only: simulated latency and failure rate of the providers. */
  FAKE_LATENCY_MS?: string;
  FAKE_FAIL_EVERY?: string;
  /** Dev only: include catalog entries still awaiting editorial approval (BG-11). */
  CATALOG_ALLOW_DRAFTS?: string;
  /** Emergency brake for the booking flow. */
  BOOKING_ENABLED?: string;
  // Secrets (wrangler secret put / .dev.vars)
  LITEAPI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ORS_API_KEY?: string;
  RESEND_API_KEY?: string;
  SIGNING_KEY?: string;
  IP_HASH_SALT?: string;
  ALTCHA_HMAC_KEY?: string;
  OPS_HB_TOKEN?: string;
}

const boolString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const runtimeConfigSchema = z.object({
  APP_ENV: z.enum(['dev', 'test', 'staging', 'production']),
  PROVIDERS_MODE: z.enum(providersModes),
  LLM_ENABLED: boolString,
  LITEAPI_BASE_URL: z.url(),
  LITEAPI_BOOK_BASE_URL: z.url(),
  LITEAPI_PAYMENT_MODE: z.enum(['sandbox', 'live']),
  ORS_BASE_URL: z.url(),
  FAKE_LATENCY_MS: z.coerce.number().int().min(0).max(5000).default(0),
  FAKE_FAIL_EVERY: z.coerce.number().int().min(0).max(10_000).default(0),
  CATALOG_ALLOW_DRAFTS: boolString.default(false),
  BOOKING_ENABLED: boolString.default(true),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema> & { version: string };

export class ConfigurationError extends Error {
  constructor(readonly paths: string[]) {
    super(`invalid worker configuration: ${paths.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}

export function parseRuntimeConfig(env: Env, version: string): RuntimeConfig {
  const result = runtimeConfigSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigurationError(result.error.issues.map((i) => i.path.join('.')));
  }
  if (result.data.PROVIDERS_MODE === 'live' && result.data.APP_ENV !== 'production') {
    throw new ConfigurationError(['PROVIDERS_MODE=live requires APP_ENV=production']);
  }
  if (result.data.APP_ENV === 'production' && result.data.PROVIDERS_MODE !== 'live') {
    throw new ConfigurationError(['APP_ENV=production requires PROVIDERS_MODE=live']);
  }
  if (result.data.CATALOG_ALLOW_DRAFTS && result.data.APP_ENV !== 'dev' && result.data.APP_ENV !== 'test') {
    throw new ConfigurationError(['CATALOG_ALLOW_DRAFTS is only allowed in dev']);
  }
  return { ...result.data, version };
}
