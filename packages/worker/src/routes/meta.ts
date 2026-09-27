// GET /api/v1/meta/config: runtime facts the SPA needs (environment, provider
// mode, payment mode). Product values come from @reiseplaner/config directly.
import { Hono } from 'hono';
import type { MetaConfigResponse } from '@reiseplaner/contracts';
import type { AppEnv } from '../app';

export const metaRoutes = new Hono<AppEnv>().get('/config', (c) => {
  const { config } = c.get('deps');
  const body: MetaConfigResponse = {
    app_env: config.APP_ENV,
    providers_mode: config.PROVIDERS_MODE,
    llm_enabled: config.LLM_ENABLED,
    payment_mode: config.LITEAPI_PAYMENT_MODE,
  };
  return c.json(body);
});
