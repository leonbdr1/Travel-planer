import { productConfig } from '@reiseplaner/config';
import { createProviders } from '@reiseplaner/providers';
import { describe, expect, it } from 'vitest';
import { checkAssertion } from '../src/eval/assertions';
import { runEval } from '../src/eval/engine';
import { createLlmJudge } from '../src/eval/judge';
import { queryItems, queryPath } from '../src/eval/jsonpath';
import { fakeResponders } from '../src/fake';
import { loadAllBundles } from '../src/load';
import { getSkill } from '../src/registry';
import { fakeLlm } from './helpers';

const doc = { places: [{ name: 'A', themes: [{ code: 'seen', strength: 3 }] }, { name: 'B', themes: [] }], n: 2 };

describe('jsonpath subset', () => {
  it('supports keys, indices, wildcards and recursive descent', () => {
    expect(queryPath(doc, '$.n')).toEqual([2]);
    expect(queryPath(doc, '$.places[1].name')).toEqual(['B']);
    expect(queryPath(doc, '$.places[*].name')).toEqual(['A', 'B']);
    expect(queryPath(doc, '$.places[*].themes[*].code')).toEqual(['seen']);
    expect(queryPath(doc, '$..strength')).toEqual([3]);
    expect(queryPath(doc, '$..lat')).toEqual([]);
    expect(queryItems(doc, '$.places')).toHaveLength(2);
    expect(() => queryPath(doc, '$.places[?(@.x)]')).toThrow(/unsupported/);
  });
});

describe('assertions', () => {
  it('evaluates every operator', () => {
    const out = { chips: ['sauber', 'ruhig'], unmatched: ['Blick auf den See'], d: ['kurz'] };
    const ok = (a: Parameters<typeof checkAssertion>[1]) => checkAssertion(out, a) === null;
    expect(ok({ path: '$.chips', op: 'set_equals', value: ['ruhig', 'sauber'] })).toBe(true);
    expect(ok({ path: '$.chips', op: 'equals', value: ['sauber', 'ruhig'] })).toBe(true);
    expect(ok({ path: '$.chips', op: 'contains', value: 'sauber' })).toBe(true);
    expect(ok({ path: '$.chips', op: 'not_contains', value: 'wlan' })).toBe(true);
    expect(ok({ path: '$.chips', op: 'every_in', value: ['sauber', 'ruhig', 'wlan'] })).toBe(true);
    expect(ok({ path: '$.chips', op: 'every_in', value: ['sauber'] })).toBe(false);
    expect(ok({ path: '$.d', op: 'max_length', value: 4 })).toBe(true);
    expect(ok({ path: '$.d', op: 'max_length', value: 3 })).toBe(false);
    expect(ok({ path: '$.unmatched', op: 'count_eq', value: 1 })).toBe(true);
    expect(ok({ path: '$.unmatched', op: 'count_lte', value: 0 })).toBe(false);
    expect(ok({ path: '$.unmatched', op: 'count_gte', value: 1 })).toBe(true);
    expect(ok({ path: '$.unmatched', op: 'matches', value: 'see', flags: 'i' })).toBe(true);
    expect(ok({ path: '$.unmatched', op: 'not_matches', value: 'garantiert', flags: 'i' })).toBe(true);
    expect(ok({ path: '$..lat', op: 'absent' })).toBe(true);
    expect(ok({ path: '$.chips', op: 'present' })).toBe(true);
    expect(checkAssertion(out, { path: '$.chips', op: 'contains', value: 'wlan' })).toContain('erhalten');
  });
});

describe('runEval', () => {
  const bundle = loadAllBundles(productConfig.ai).find((b) => b.manifest.id === 'reiseplaner.catalog-places');
  if (!bundle) throw new Error('bundle missing');

  it('runs the catalog-places dataset against the fake model at zero cost', async () => {
    const report = await runEval({
      bundle,
      compiled: getSkill('reiseplaner.catalog-places'),
      llm: fakeLlm(),
      prices: productConfig.ai,
      fake: true,
      now: () => new Date('2026-09-27T00:00:00Z'),
    });
    expect(report).toMatchObject({ mode: 'fake', counted: 10, passed: 10, score: 1, costUsd: 0, regression: null, aborted: false });
  });

  it('asks the judge for rubrics in real mode and fails cases it rejects', async () => {
    const llm = createProviders(
      {
        mode: 'fake',
        liteapi: { baseUrl: 'http://x', bookBaseUrl: 'http://x' },
        ors: { baseUrl: 'http://x' },
        resend: {},
        anthropic: {},
      },
      {
        fake: {
          llmResponders: {
            ...fakeResponders,
            submit_verdict: ({ user }) => ({ pass: !user.includes('Rügen'), reason: 'Rügen abgelehnt' }),
          },
        },
      },
    ).llm;
    const report = await runEval({
      bundle,
      compiled: getSkill('reiseplaner.catalog-places'),
      llm,
      prices: productConfig.ai,
      fake: false,
      judge: createLlmJudge(llm, productConfig.ai.eval_judge_model, productConfig.ai),
      now: () => new Date('2026-09-27T00:00:00Z'),
    });
    expect(report.failed).toBe(1);
    expect(report.cases.find((c) => c.status === 'fail')?.failures).toEqual(['Judge: Rügen abgelehnt']);
    expect(report.score).toBe(0.9);
    expect(report.regression).toBeNull();
  });
});
