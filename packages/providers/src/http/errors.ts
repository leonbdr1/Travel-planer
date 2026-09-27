// Provider errors carry a kind so callers can decide between retry, fallback
// and "no data" without parsing messages.
export type ProviderErrorKind =
  | 'rate_limited' // 429
  | 'quota_exhausted' // 403 from quota-limited APIs (ORS)
  | 'server' // 5xx
  | 'timeout'
  | 'network'
  | 'bad_response' // unparseable or schema mismatch
  | 'client' // other 4xx
  | 'not_configured'; // missing API key etc.

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: ProviderErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(`${provider}: ${message}`);
    this.name = 'ProviderError';
  }

  get retryable(): boolean {
    return this.kind === 'rate_limited' || this.kind === 'server' || this.kind === 'timeout' || this.kind === 'network';
  }
}
