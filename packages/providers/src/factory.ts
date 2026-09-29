// Provider selection by PROVIDERS_MODE (architektur.md 3.5): `fake` wires every
// adapter to its simulated transport, `sandbox`/`live` to the real services.
// `sources` pins single providers to fake or real (Testbetrieb).
import { productConfig } from '@reiseplaner/config';
import type { FetchLike } from './http/request';
import { createAnthropicClient } from './llm/anthropic';
import type { LlmPort } from './llm/port';
import { createLiteApiClient, type LiteApiPort } from './liteapi/client';
import { createResendClient, type MailPort } from './mail/client';
import { createOrsClient, type RoutingPort } from './routing/client';
import { createOverpassClient, OVERPASS_PUBLIC_URL, type PoiPort } from './poi/client';
import { createFakeAnthropicFetch, type FakeLlmResponder } from './fake/anthropic-fetch';
import { createFakeLiteApiFetch, type FakeFault } from './fake/liteapi-fetch';
import { createFakeOrsFetch } from './fake/ors-fetch';
import { createFakeOverpassFetch } from './fake/overpass-fetch';
import { createFakeRatingSource } from './fake/rating-source';
import { createFakeReferencePrice } from './fake/reference-price';
import { createFakeResendFetch } from './fake/resend-fetch';
import { createTripadvisorRatingSource } from './rating-source/tripadvisor';
import { createUnverifiedRatingSource, type RatingSourcePort } from './rating-source/port';
import { createUnverifiedReferencePrice, type ReferencePricePort } from './reference-price/port';
import { providerSources, type ProviderSources, type ProvidersMode } from './mode';

export interface ProvidersConfig {
  mode: ProvidersMode;
  /** Per-provider override of the source implied by `mode`. */
  sources?: Partial<ProviderSources>;
  liteapi: { apiKey?: string | undefined; baseUrl: string; bookBaseUrl: string };
  ors: { apiKey?: string | undefined; baseUrl: string };
  /** OpenStreetMap points of interest; no key. Defaults to the public instance. */
  overpass?: { baseUrl: string };
  resend: { apiKey?: string | undefined };
  anthropic: { apiKey?: string | undefined };
  /** Tripadvisor Content API (additional rating source); without a key the source stays off. */
  tripadvisor?: { apiKey?: string | undefined; baseUrl?: string };
}

export interface FakeTuning {
  latencyMs?: number;
  failEvery?: number;
  faults?: FakeFault[];
  orsQuotaExhausted?: boolean;
  mailFailNext?: { remaining: number };
  /** Deterministic fake models per tool name (packages/skills/src/fake). */
  llmResponders?: Readonly<Record<string, FakeLlmResponder>>;
  llmInvalidNext?: { remaining: number };
  llmFailNext?: { remaining: number; status: number };
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
  /** Effective source of every provider (mode plus overrides). */
  sources: ProviderSources;
  liteapi: LiteApiPort;
  /** Public reference price (beta); live adapter pending the contract check. */
  referencePrice: ReferencePricePort;
  /** Additional rating source for houses without or with few own ratings; live adapter pending the contract check. */
  ratings: RatingSourcePort;
  routing: RoutingPort;
  /** OpenStreetMap points of interest (location facts in the finale). */
  poi: PoiPort;
  mail: MailPort;
  llm: LlmPort;
}

export function createProviders(config: ProvidersConfig, hooks: ProviderHooks = {}): Providers {
  const realFetch: FetchLike = hooks.fetch ?? ((input, init) => fetch(input, init));
  const sources = providerSources(config.mode, config.sources);
  const fakeLiteapi = sources.liteapi === 'fake';
  const fakeRouting = sources.routing === 'fake';
  const fakeMail = sources.mail === 'fake';
  const fakeLlm = sources.llm === 'fake';
  const count = (provider: string) => (endpoint: string) => hooks.onCall?.(provider, endpoint);
  const tuning = hooks.fake ?? {};

  const liteapiFetch = fakeLiteapi
    ? createFakeLiteApiFetch({
        ...(hooks.now ? { now: hooks.now } : {}),
        ...(tuning.latencyMs !== undefined ? { latencyMs: tuning.latencyMs } : {}),
        ...(tuning.failEvery !== undefined ? { failEvery: tuning.failEvery } : {}),
        ...(tuning.faults ? { faults: tuning.faults } : {}),
      })
    : realFetch;

  return {
    mode: config.mode,
    sources,
    liteapi: createLiteApiClient({
      apiKey: fakeLiteapi ? 'fake-key' : config.liteapi.apiKey,
      baseUrl: config.liteapi.baseUrl,
      bookBaseUrl: config.liteapi.bookBaseUrl,
      fetch: liteapiFetch,
      onCall: count('liteapi'),
      ...(hooks.sleep ? { sleep: hooks.sleep } : {}),
    }),
    referencePrice: fakeLiteapi
      ? createFakeReferencePrice({
          onCall: count('liteapi'),
          ...(tuning.latencyMs !== undefined ? { latencyMs: tuning.latencyMs } : {}),
        })
      : createUnverifiedReferencePrice(),
    ratings: fakeLiteapi
      ? createFakeRatingSource({
          onCall: count('ratings'),
          ...(tuning.latencyMs !== undefined ? { latencyMs: tuning.latencyMs } : {}),
        })
      : config.tripadvisor?.apiKey
        ? createTripadvisorRatingSource({
            apiKey: config.tripadvisor.apiKey,
            ...(config.tripadvisor.baseUrl ? { baseUrl: config.tripadvisor.baseUrl } : {}),
            fetch: realFetch,
            onCall: count('tripadvisor'),
          })
        : createUnverifiedRatingSource(),
    routing: createOrsClient({
      apiKey: fakeRouting ? 'fake-key' : config.ors.apiKey,
      baseUrl: config.ors.baseUrl,
      fetch: fakeRouting ? createFakeOrsFetch(tuning.orsQuotaExhausted ? { quotaExhausted: true } : {}) : realFetch,
      onCall: count('ors'),
    }),
    poi: createOverpassClient({
      baseUrl: config.overpass?.baseUrl ?? OVERPASS_PUBLIC_URL,
      fetch: sources.poi === 'fake' ? createFakeOverpassFetch() : realFetch,
      userAgent: `${productConfig.slug} (${productConfig.domains.primary})`,
      onCall: count('overpass'),
    }),
    mail: createResendClient({
      apiKey: fakeMail ? 'fake-key' : config.resend.apiKey,
      fetch: fakeMail ? createFakeResendFetch(tuning.mailFailNext ? { failNext: tuning.mailFailNext } : {}) : realFetch,
      onCall: count('resend'),
    }),
    llm: createAnthropicClient({
      apiKey: fakeLlm ? 'fake-key' : config.anthropic.apiKey,
      fetch: fakeLlm
        ? createFakeAnthropicFetch({
            responders: tuning.llmResponders ?? {},
            noSamplingModels: noSamplingModels(),
            ...(tuning.llmInvalidNext ? { invalidNext: tuning.llmInvalidNext } : {}),
            ...(tuning.llmFailNext ? { failNext: tuning.llmFailNext } : {}),
          })
        : realFetch,
      onCall: count('anthropic'),
      billed: !fakeLlm,
      ...(fakeLlm ? { maxRetries: 0 } : {}),
      ...(hooks.sleep ? { sleep: hooks.sleep } : {}),
    }),
  };
}

function noSamplingModels(): string[] {
  return Object.entries(productConfig.ai.models)
    .filter(([, m]) => !m.sampling_params)
    .map(([id]) => id);
}
