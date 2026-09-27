// Booking routes in workerd: token and ALTCHA gates at the HTTP layer (the
// full flow is covered in test-node/bookings.test.ts and demo s8.2).
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';

let n = 0;
const api = (path: string, init: RequestInit = {}) =>
  exports.default.fetch(`http://app.test/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `198.51.100.${++n}`, ...(init.headers ?? {}) },
  });

async function altcha(): Promise<string> {
  const challenge = (await (await api('/meta/altcha-challenge')).json()) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) throw new Error('unsolved');
  return btoa(JSON.stringify({ challenge, solution }));
}

describe('booking routes', () => {
  it('requires a valid token for view, complete and cancel', async () => {
    expect((await api('/bookings/K7M2Q9XZ')).status).toBe(403);
    expect((await api('/bookings/K7M2Q9XZ', { headers: { 'x-booking-token': 'a'.repeat(40) } })).status).toBe(403);
    expect((await api('/bookings/K7M2Q9XZ/complete', { method: 'POST', body: '{}' })).status).toBe(403);
    expect((await api('/bookings/K7M2Q9XZ/cancel', { method: 'POST', body: JSON.stringify({ dry_run: true }) })).status).toBe(403);
  });

  it('validates the booking request (terms must be accepted)', async () => {
    const res = await api('/bookings', { method: 'POST', body: JSON.stringify({ search_id: crypto.randomUUID(), accepted_terms: false }) });
    expect(res.status).toBe(400);
  });

  it('answers access-link requests with 202 regardless of the booking, but needs ALTCHA', async () => {
    const body = { booking_ref: 'K7M2Q9XZ', email: 'niemand@example.org' };
    expect((await api('/bookings/access-link', { method: 'POST', body: JSON.stringify({ ...body, altcha: 'invalid' }) })).status).toBe(400);
    const res = await api('/bookings/access-link', { method: 'POST', body: JSON.stringify({ ...body, altcha: await altcha() }) });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
  });
});
