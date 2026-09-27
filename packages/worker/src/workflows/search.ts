// SearchWorkflow (architektur.md 6.4): `load` → `rates-<n>` → `score-1` →
// `finalize`. The review check joins before finalize in M7.
// Steps return only ids and counters (1 MiB limit); every write is idempotent,
// so a retried step never duplicates offers.
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers';
import { productConfig } from '@reiseplaner/config';
import { createRequestDeps } from '../deps';
import { parseRuntimeConfig, type Env } from '../env';
import { runFinalize, runLoad, runRatesBlock, runScoreStep, type SearchRunDeps } from '../services/search-run';

export interface SearchParams {
  searchId: string;
}

const STEP: WorkflowStepConfig = {
  retries: { limit: 2, delay: '1 second', backoff: 'exponential' },
  timeout: '60 seconds',
};

declare const __GIT_SHA__: string | undefined;

/** Per-step dependencies: fresh DB connection and providers, usage flushed at the end. */
export async function withSearchDeps<T>(env: Env, fn: (deps: SearchRunDeps) => Promise<T>): Promise<T> {
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
    const final = await step.do('finalize', STEP, () => withSearchDeps(this.env, (d) => runFinalize(d, searchId)));
    return { status: final.status };
  }
}
