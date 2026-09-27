// Deterministic, non-secret values for the test runtime.
export const testBindings = {
  APP_ENV: 'test',
  PROVIDERS_MODE: 'fake',
  LLM_ENABLED: 'true',
  SIGNING_KEY: 'test-signing-key-not-secret',
  IP_HASH_SALT: 'test-ip-hash-salt',
  ALTCHA_HMAC_KEY: 'test-altcha-hmac-key',
  OPS_HB_TOKEN: 'test-ops-token',
} as const;
