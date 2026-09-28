// Client identity for rate limits: sha256(ip | IP_HASH_SALT | UTC date)
// (architektur.md 11.1). Never the IP itself; the date makes the hash change
// daily, so a person cannot be followed across days (retention
// compliance.retention.ip_hash_days).
import type { Context } from 'hono';
import { ConfigurationError } from '../env';
import type { AppEnv } from '../app';

export async function clientHash(c: Context<AppEnv>): Promise<string> {
  const deps = c.get('deps');
  const salt = deps.env.IP_HASH_SALT;
  if (!salt && (deps.config.APP_ENV === 'staging' || deps.config.APP_ENV === 'production')) {
    throw new ConfigurationError(['IP_HASH_SALT']);
  }
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const day = deps.now().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${salt ?? 'dev-only-salt'}|${day}`));
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
