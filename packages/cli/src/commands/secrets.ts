// `npm run cli -- secrets check`: which secrets are set (never the values).
import { cliEnv } from '../lib/env';

const NAMES = ['LITEAPI_API_KEY', 'ANTHROPIC_API_KEY', 'ORS_API_KEY', 'RESEND_API_KEY', 'SIGNING_KEY', 'IP_HASH_SALT', 'ALTCHA_HMAC_KEY', 'OPS_HB_TOKEN'];

export async function secretsCommand(args: string[], log: (line: string) => void): Promise<number> {
  if (args[0] !== 'check') {
    log('usage: secrets check');
    return 2;
  }
  const env = cliEnv();
  for (const name of NAMES) log(`${name}: ${env[name] ? 'gesetzt' : 'fehlt'}`);
  return 0;
}
