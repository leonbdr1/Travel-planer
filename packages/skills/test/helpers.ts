import { productConfig } from '@reiseplaner/config';
import { createProviders, type FakeTuning } from '@reiseplaner/providers';
import { fakeResponders } from '../src/fake';
import { memorySkillHooks } from '../src/hooks';
import type { SkillRunnerDeps } from '../src/runner';

export function fakeLlm(tuning: FakeTuning = {}) {
  return createProviders(
    {
      mode: 'fake',
      liteapi: { baseUrl: 'http://unused', bookBaseUrl: 'http://unused' },
      ors: { baseUrl: 'http://unused' },
      resend: {},
      anthropic: {},
    },
    { fake: { llmResponders: fakeResponders, ...tuning } },
  ).llm;
}

export function runnerDeps(overrides: Partial<SkillRunnerDeps> = {}, capUsd = 1) {
  const hooks = memorySkillHooks(capUsd);
  const deps: SkillRunnerDeps = {
    llm: fakeLlm(),
    llmEnabled: true,
    prices: productConfig.ai,
    budget: hooks.budget,
    telemetry: hooks.telemetry,
    ...overrides,
  };
  return { deps, hooks };
}
