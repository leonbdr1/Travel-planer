import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { wishParseResponseSchema } from '@reiseplaner/contracts';
import { createPostgresDb } from '@reiseplaner/db';
import { createApp } from '../src/app';

let n = 0;
const post = (text: unknown, ip = `198.51.100.${++n}`) =>
  exports.default.fetch('http://app.test/api/v1/wishes/parse', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify({ text }),
  });

describe('POST /wishes/parse', () => {
  it('translates free text into chips through the skill runner (fake model)', async () => {
    const res = await post('sauber, ruhig und Blick auf den See');
    expect(res.status).toBe(200);
    const body = wishParseResponseSchema.parse(await res.json());
    expect(body).toEqual({
      chips: ['sauber', 'ruhig'],
      themes: [],
      review_topics: [],
      unmatched: ['Blick auf den See'],
      translated: true,
      notice: null,
    });
    const db = createPostgresDb(env.HYPERDRIVE.connectionString, { max: 1 });
    try {
      const runs = await db.query<{ outcome: string; input_hash: string }>(
        "SELECT outcome, input_hash FROM app.skill_runs WHERE skill = 'reiseplaner.wish-parse' ORDER BY id DESC LIMIT 1",
      );
      expect(runs[0]?.outcome).toBe('ok');
      expect(runs[0]?.input_hash).toMatch(/^[0-9a-f]{64}$/);
      const leaked = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM app.skill_runs WHERE error_message LIKE '%See%'");
      expect(leaked[0]?.n).toBe(0);
    } finally {
      await db.close();
    }
  });

  it('falls back with a notice when LLM_ENABLED is false', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/v1/wishes/parse',
      { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.250' }, body: JSON.stringify({ text: 'sauber' }) },
      { ...env, LLM_ENABLED: 'false' },
    );
    const body = wishParseResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ chips: [], translated: false });
    expect(body.notice).toContain('Chips');
  });

  it('validates the text length', async () => {
    expect((await post('')).status).toBe(400);
    expect((await post('x'.repeat(301))).status).toBe(400);
  });

  it('limits wish parsing per client (30 per hour)', async () => {
    const ip = '198.51.100.251';
    for (let i = 0; i < 30; i += 1) {
      const res = await post('ruhig', ip);
      expect(res.status).toBe(200);
      await res.body?.cancel();
    }
    expect((await post('ruhig', ip)).status).toBe(429);
  }, 60_000);
});
