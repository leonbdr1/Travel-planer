// POST /api/v1/wishes/parse (architektur.md 9.2, F1): free-text wishes →
// chips, themes and review topics through the skill runner (cost cap,
// fail-closed llm_usd budget, forced tool call, output check, fallback).
// Only hashes reach skill_runs; the free text is neither stored nor logged.
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import { wishParseRequestSchema, type WishParseResponse } from '@reiseplaner/contracts';
import { WISH_FALLBACK_NOTICE } from '@reiseplaner/domain';
import { dbSkillHooks, runSkill } from '@reiseplaner/skills';
import type { AppEnv } from '../app';
import { rateLimit } from '../http/rate-limit';
import { effectiveLlmEnabled } from '../services/dev-settings';
import { parseJsonBody } from '../http/validate';

const HOUR_S = 3600;

interface WishMapping {
  chips: string[];
  themes: string[];
  review_topics: string[];
  unmatched: string[];
}

export const wishRoutes = new Hono<AppEnv>().post(
  '/parse',
  rateLimit('wishes', productConfig.limits.rate_limits.wishes_per_hour, HOUR_S),
  async (c) => {
    const { text } = await parseJsonBody(c, wishParseRequestSchema);
    const deps = c.get('deps');
    const db = deps.db();
    const result = await runSkill<WishMapping>(
      {
        llm: deps.providers().llm,
        llmEnabled: await effectiveLlmEnabled(db, deps.config),
        prices: productConfig.ai,
        ...dbSkillHooks(db, productConfig.limits.llm_daily_budget_usd),
      },
      'reiseplaner.wish-parse',
      { text },
      { correlationId: crypto.randomUUID() },
    );
    const body: WishParseResponse = result.ok
      ? { ...result.output, translated: true, notice: null }
      : { chips: [], themes: [], review_topics: [], unmatched: [], translated: false, notice: WISH_FALLBACK_NOTICE };
    return c.json(body);
  },
);
