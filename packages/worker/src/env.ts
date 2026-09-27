// Bindings and runtime configuration of the Worker (architektur.md 12).
// Vars are validated with zod on every request; secrets are only checked for
// presence here and never logged.
import { z } from 'zod';
import { providersModes } from '@reiseplaner/providers';

export interface Env {
  HYPERDRIVE: Hyperdrive;
  ASSETS?: Fetcher;
  APP_ENV: string;
  PROVIDERS_MODE: string;
  LLM_ENABLED: string;
  LITEAPI_BASE_URL: string;
  LITEAPI_BOOK_BASE_URL: string;
  LITEAPI_PAYMENT_MODE: string;
  ORS_BASE_URL: string;
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
  return { ...result.data, version };
}
