// Provider selection by PROVIDERS_MODE (architektur.md 3.5): `fake` wires every
// adapter to its simulated transport, `sandbox`/`live` to the real services.
import type { FetchLike } from './http/request';
import { createLiteApiClient, type LiteApiPort } from './liteapi/client';
import { createResendClient, type MailPort } from './mail/client';
import { createOrsClient, type RoutingPort } from './routing/client';
import { createFakeLiteApiFetch, type FakeFault } from './fake/liteapi-fetch';
import { createFakeOrsFetch } from './fake/ors-fetch';
import { createFakeResendFetch } from './fake/resend-fetch';
import type { ProvidersMode } from './mode';

export interface ProvidersConfig {
  mode: ProvidersMode;
  liteapi: { apiKey?: string | undefined; baseUrl: string; bookBaseUrl: string };
  ors: { apiKey?: string | undefined; baseUrl: string };
  resend: { apiKey?: string | undefined };
}

export interface FakeTuning {
  latencyMs?: number;
  failEvery?: number;
  faults?: FakeFault[];
  orsQuotaExhausted?: boolean;
  mailFailNext?: { remaining: number };
}

export interface ProviderHooks {
  /** Called once per outgoing HTTP attempt (provider_usage accounting). */
  onCall?: (provider: string, endpoint: string) => void;
  now?: () => Date;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  fake?: FakeTuning;
}

export interface Providers {
  mode: ProvidersMode;
  liteapi: LiteApiPort;
  routing: RoutingPort;
  mail: MailPort;
}

export function createProviders(config: ProvidersConfig, hooks: ProviderHooks = {}): Providers {
  const realFetch: FetchLike = hooks.fetch ?? ((input, init) => fetch(input, init));
  const fake = config.mode === 'fake';
  const count = (provider: string) => (endpoint: string) => hooks.onCall?.(provider, endpoint);
  const tuning = hooks.fake ?? {};

  const liteapiFetch = fake
    ? createFakeLiteApiFetch({
        ...(hooks.now ? { now: hooks.now } : {}),
        ...(tuning.latencyMs !== undefined ? { latencyMs: tuning.latencyMs } : {}),
        ...(tuning.failEvery !== undefined ? { failEvery: tuning.failEvery } : {}),
        ...(tuning.faults ? { faults: tuning.faults } : {}),
      })
    : realFetch;

  return {
    mode: config.mode,
    liteapi: createLiteApiClient({
      apiKey: fake ? 'fake-key' : config.liteapi.apiKey,
      baseUrl: config.liteapi.baseUrl,
      bookBaseUrl: config.liteapi.bookBaseUrl,
      fetch: liteapiFetch,
      onCall: count('liteapi'),
      ...(hooks.sleep ? { sleep: hooks.sleep } : {}),
    }),
    routing: createOrsClient({
      apiKey: fake ? 'fake-key' : config.ors.apiKey,
      baseUrl: config.ors.baseUrl,
      fetch: fake ? createFakeOrsFetch(tuning.orsQuotaExhausted ? { quotaExhausted: true } : {}) : realFetch,
      onCall: count('ors'),
    }),
    mail: createResendClient({
      apiKey: fake ? 'fake-key' : config.resend.apiKey,
      fetch: fake ? createFakeResendFetch(tuning.mailFailNext ? { failNext: tuning.mailFailNext } : {}) : realFetch,
      onCall: count('resend'),
    }),
  };
}
