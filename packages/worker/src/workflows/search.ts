// SearchWorkflow (architektur.md 6.4): `load` → `rates-<n>` → `score-1` →
// `reviews-fetch` → `reviews-verify` → `finalize` (score stage 2).
// Steps return only ids and counters (1 MiB limit); every write is idempotent,
// so a retried step never duplicates offers.
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers';
import { productConfig } from '@reiseplaner/config';
import { createRequestDeps } from '../deps';
import { parseRuntimeConfig, type Env } from '../env';
import { runReviewsFetch, runReviewsVerify, type ReviewRunDeps } from '../services/reviews';
import { runFinalize, runLoad, runRatesBlock, runScoreStep } from '../services/search-run';

export interface SearchParams {
  searchId: string;
}

const STEP: WorkflowStepConfig = {
  retries: { limit: 2, delay: '1 second', backoff: 'exponential' },
  timeout: '60 seconds',
};

declare const __GIT_SHA__: string | undefined;

/** Per-step dependencies: fresh DB connection and providers, usage flushed at the end. */
export async function withSearchDeps<T>(env: Env, fn: (deps: ReviewRunDeps) => Promise<T>): Promise<T> {
  const config = parseRuntimeConfig(env, typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : 'dev');
  const deps = createRequestDeps(env, config);
  try {
    return await fn({
      db: deps.db(),
      liteapi: deps.providers().liteapi,
      now: deps.now,
      liteapiDailyCap: productConfig.limits.daily_quotas.liteapi_calls,
      currency: productConfig.markets.currency,
      guestNationality: productConfig.markets.guest_nationality,
      llm: deps.providers().llm,
      llmEnabled: config.LLM_ENABLED,
      llmDailyBudgetUsd: productConfig.limits.llm_daily_budget_usd,
    });
  } finally {
    await deps.dispose({ awaitClose: false });
  }
}

export class SearchWorkflow extends WorkflowEntrypoint<Env, SearchParams> {
  override async run(event: Readonly<WorkflowEvent<SearchParams>>, step: WorkflowStep): Promise<{ status: string }> {
    const { searchId } = event.payload;
    const loaded = await step.do('load', STEP, () => withSearchDeps(this.env, (d) => runLoad(d, searchId)));
    for (let i = 0; i < loaded.blocks; i += 1) {
      const block = await step.do(`rates-${i}`, STEP, () => withSearchDeps(this.env, (d) => runRatesBlock(d, searchId, i)));
      if (block.timedOut) break;
    }
    await step.do('score-1', STEP, () => withSearchDeps(this.env, (d) => runScoreStep(d, searchId)));
    // Separate steps: a failing AI call is retried without fetching reviews again.
    await step.do('reviews-fetch', STEP, () => withSearchDeps(this.env, (d) => runReviewsFetch(d, searchId)));
    await step.do('reviews-verify', STEP, () => withSearchDeps(this.env, (d) => runReviewsVerify(d, searchId)));
    const final = await step.do('finalize', STEP, () => withSearchDeps(this.env, (d) => runFinalize(d, searchId)));
    return { status: final.status };
  }
}
