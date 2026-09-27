// Client identity for rate limits: a salted SHA-256 of the connecting IP
// (never the IP itself; architektur.md 11.1, retention compliance.retention.ip_hash_days).
import type { Context } from 'hono';
import { ConfigurationError } from '../env';
import type { AppEnv } from '../app';

export async function clientHash(c: Context<AppEnv>): Promise<string> {
  const { env, config } = c.get('deps');
  const salt = env.IP_HASH_SALT;
  if (!salt && (config.APP_ENV === 'staging' || config.APP_ENV === 'production')) {
    throw new ConfigurationError(['IP_HASH_SALT']);
  }
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt ?? 'dev-only-salt'}:${ip}`));
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
