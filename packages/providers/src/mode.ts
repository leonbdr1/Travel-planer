// PROVIDERS_MODE switches every provider adapter at once (architektur.md 3.5).
// For local test operation with real data (Testbetrieb, HANDOFF drift 27) a
// single provider can be pinned to its simulated or real source; without
// overrides every provider follows PROVIDERS_MODE.
export const providersModes = ['fake', 'sandbox', 'live'] as const;
export type ProvidersMode = (typeof providersModes)[number];

export function isProvidersMode(value: unknown): value is ProvidersMode {
  return typeof value === 'string' && (providersModes as readonly string[]).includes(value);
}

export const providerNames = ['liteapi', 'routing', 'llm', 'mail', 'poi'] as const;
export type ProviderName = (typeof providerNames)[number];
export const providerSourceValues = ['fake', 'real'] as const;
export type ProviderSource = (typeof providerSourceValues)[number];
export type ProviderSources = Record<ProviderName, ProviderSource>;

export function providerSources(mode: ProvidersMode, overrides: Partial<ProviderSources> = {}): ProviderSources {
  const base: ProviderSource = mode === 'fake' ? 'fake' : 'real';
  return {
    liteapi: overrides.liteapi ?? base,
    routing: overrides.routing ?? base,
    llm: overrides.llm ?? base,
    mail: overrides.mail ?? base,
    poi: overrides.poi ?? base,
  };
}
