// GET/PUT /api/v1/dev/settings (S11.8): the developer page. The AI switch
// keeps test runs free of AI costs; the page also shows today's AI spend and
// the local search limits. Only in dev and test (404 elsewhere).
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import { devSettingsUpdateSchema, type DevSettingsResponse } from '@reiseplaner/contracts';
import { budgetStatus } from '@reiseplaner/db';
import type { AppEnv } from '../app';
import { ApiError } from '../http/errors';
import { parseJsonBody } from '../http/validate';
import { aiSwitchState, devSettingsAllowed, setAiSwitch } from '../services/dev-settings';
import type { RequestDeps } from '../deps';

async function settings(deps: RequestDeps): Promise<DevSettingsResponse> {
  const db = deps.db();
  const ai = await aiSwitchState(db, deps.config);
  const today = deps.now().toISOString().slice(0, 10);
  const llm = (await budgetStatus(db, today)).find((b) => b.scope === 'llm_usd');
  return {
    ai: {
      ...ai,
      spent_today_usd: llm ? llm.settled + llm.reserved : 0,
      daily_budget_usd: productConfig.limits.llm_daily_budget_usd,
    },
    limits: productConfig.limits.dev_rate_limits,
  };
}

export const devRoutes = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    if (!devSettingsAllowed(c.get('deps').config)) throw new ApiError(404, 'not_found', 'Nicht gefunden.');
    c.header('Cache-Control', 'no-store');
    await next();
  })
  .get('/settings', async (c) => c.json(await settings(c.get('deps'))))
  .put('/settings', async (c) => {
    const { ai_enabled } = await parseJsonBody(c, devSettingsUpdateSchema);
    await setAiSwitch(c.get('deps').db(), ai_enabled);
    return c.json(await settings(c.get('deps')));
  });
