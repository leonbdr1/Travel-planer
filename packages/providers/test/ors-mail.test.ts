import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProviders, type ProvidersConfig } from '../src';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const stuttgart = { lat: 48.78, lng: 9.18 };

describe('routing (openrouteservice)', () => {
  it('returns drive times for every destination (simulated)', async () => {
    const { routing } = createProviders(config);
    const result = await routing.matrix(stuttgart, [
      { lat: 47.41, lng: 10.28 },
      { lat: 47.57, lng: 10.7 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]!.durationMin).toBeGreaterThan(120);
    expect(result[0]!.durationMin).toBeLessThan(240);
    expect(result[0]!.distanceKm).toBeGreaterThan(173);
  });

  it('maps HTTP 403 to quota_exhausted so callers can fall back', async () => {
    const { routing } = createProviders(config, { fake: { orsQuotaExhausted: true } });
    await expect(routing.matrix(stuttgart, [{ lat: 47.41, lng: 10.28 }])).rejects.toMatchObject({ kind: 'quota_exhausted' });
  });

  it('parses the recorded-shape sample', async () => {
    const sample = readFileSync(resolve(import.meta.dirname, '../fixtures/ors/matrix.json'), 'utf8');
    const { routing } = createProviders({ ...config, mode: 'sandbox', ors: { ...config.ors, apiKey: 'k' } }, { fetch: async () => new Response(sample) });
    expect(await routing.matrix(stuttgart, [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }])).toEqual([
      { durationMin: 152, distanceKm: 201.4 },
      { durationMin: 197, distanceKm: 247.9 },
    ]);
  });
});

describe('mail (Resend)', () => {
  it('sends through the simulated transport and surfaces failures', async () => {
    const failNext = { remaining: 2 }; // first attempt + one retry
    const { mail } = createProviders(config, { fake: { mailFailNext: failNext } });
    const message = { from: 'a@example.org', to: 'b@example.org', subject: 'Test', html: '<p>x</p>', text: 'x' };
    await expect(mail.send(message)).rejects.toMatchObject({ kind: 'server' });
    const sent = await mail.send(message);
    expect(sent.providerMessageId).toMatch(/^fake_/);
  });
});
