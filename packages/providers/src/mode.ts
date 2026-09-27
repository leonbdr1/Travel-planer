// PROVIDERS_MODE switches every provider adapter at once (architektur.md 3.5).
export const providersModes = ['fake', 'sandbox', 'live'] as const;
export type ProvidersMode = (typeof providersModes)[number];

export function isProvidersMode(value: unknown): value is ProvidersMode {
  return typeof value === 'string' && (providersModes as readonly string[]).includes(value);
}
