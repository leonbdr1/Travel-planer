// CLI environment: PROVIDERS_MODE and keys from the process environment,
// falling back to packages/worker/.dev.vars (local sandbox keys). Values are
// never printed.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '@reiseplaner/db/node';
import { isProvidersMode, type ProvidersConfig, type ProvidersMode } from '@reiseplaner/providers';

export function readDevVars(): Record<string, string> {
  const path = resolve(repoRoot, 'packages/worker/.dev.vars');
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m?.[1] && m[2] !== undefined && m[2] !== '') vars[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return vars;
}

export function cliEnv(): Record<string, string | undefined> {
  return { ...readDevVars(), ...process.env };
}

export function cliMode(args: string[]): ProvidersMode {
  const i = args.indexOf('--mode');
  const value = i >= 0 ? args[i + 1] : cliEnv().PROVIDERS_MODE;
  if (value === undefined) return 'fake';
  if (!isProvidersMode(value)) throw new Error(`unknown providers mode: ${value}`);
  if (value === 'live') throw new Error('the CLI refuses PROVIDERS_MODE=live (read-only smoke tests only via npm run smoke)');
  return value;
}

export function cliProvidersConfig(mode: ProvidersMode): ProvidersConfig {
  const env = cliEnv();
  return {
    mode,
    liteapi: {
      apiKey: env.LITEAPI_API_KEY,
      baseUrl: env.LITEAPI_BASE_URL ?? 'https://api.liteapi.travel/v3.0',
      bookBaseUrl: env.LITEAPI_BOOK_BASE_URL ?? 'https://book.liteapi.travel/v3.0',
    },
    ors: { apiKey: env.ORS_API_KEY, baseUrl: env.ORS_BASE_URL ?? 'https://api.heigit.org/openrouteservice' },
    resend: { apiKey: env.RESEND_API_KEY },
  };
}
