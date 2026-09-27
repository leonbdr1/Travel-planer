// ALTCHA v2 proof of work (architektur.md 2.2, 11.1): stateless challenges
// signed with ALTCHA_HMAC_KEY, SHA-256 key derivation, counter drawn from
// [0, ALTCHA_COST). A solved challenge is accepted once: its signature is
// burnt through app.increment_rate_limit (max 1 within the expiry window).
import { createChallenge, randomInt, verifySolution, type Challenge, type Solution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';
import { incrementRateLimit, type Queryable } from '@reiseplaner/db';
import { constants } from '@reiseplaner/domain';

export const ALTCHA_ALGORITHM = 'SHA-256';

export function newChallenge(secret: string, now: Date): Promise<Challenge> {
  return createChallenge({
    algorithm: ALTCHA_ALGORITHM,
    cost: 1,
    counter: randomInt(constants.ALTCHA_COST),
    deriveKey,
    hmacSignatureSecret: secret,
    expiresAt: Math.floor(now.getTime() / 1000) + constants.ALTCHA_EXPIRES_S,
  });
}

export type AltchaCheck = { ok: true } | { ok: false; reason: 'malformed' | 'invalid' | 'expired' | 'reused' };

function decodePayload(payload: string): { challenge: Challenge; solution: Solution } | null {
  try {
    const text = atob(payload);
    const value = JSON.parse(text) as { challenge?: Challenge; solution?: Solution };
    if (!value.challenge?.parameters || !value.solution || typeof value.solution.derivedKey !== 'string') return null;
    return { challenge: value.challenge, solution: value.solution };
  } catch {
    return null;
  }
}

export async function verifyAltcha(db: Queryable, payload: string, secret: string): Promise<AltchaCheck> {
  const decoded = decodePayload(payload);
  if (!decoded) return { ok: false, reason: 'malformed' };
  if (decoded.challenge.parameters.algorithm !== ALTCHA_ALGORITHM) return { ok: false, reason: 'invalid' };
  const result = await verifySolution({ ...decoded, deriveKey, hmacSignatureSecret: secret });
  if (result.expired) return { ok: false, reason: 'expired' };
  if (!result.verified) return { ok: false, reason: 'invalid' };
  const burn = await incrementRateLimit(db, `altcha:${decoded.challenge.signature ?? ''}`, 1, constants.ALTCHA_EXPIRES_S);
  return burn.allowed ? { ok: true } : { ok: false, reason: 'reused' };
}
