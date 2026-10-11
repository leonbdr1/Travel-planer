// GET /api/v1/meta/config: everything the SPA needs to render the wizard
// (architektur.md 7.2): runtime facts, chips, themes, limits, AI labels and
// attribution. Values come from product.config.yaml and packages/domain.
import { Hono } from 'hono';
import { productConfig } from '@reiseplaner/config';
import type { MetaConfigResponse } from '@reiseplaner/contracts';
import { listCatalogCountries } from '@reiseplaner/db';
import { CHIPS, THEME_CODES, THEME_LABELS, constants, destinationCountryOptions } from '@reiseplaner/domain';
import type { AppEnv } from '../app';
import { ConfigurationError, configuredSources } from '../env';
import { newChallenge } from '../services/altcha';
import { ROLE_HEADER } from '../gate';
import { devSettingsAllowed, effectiveLlmEnabled, endUserView } from '../services/dev-settings';
import { effectiveMaxCombinations } from '../services/maintenance';

export const metaRoutes = new Hono<AppEnv>()
  .get('/altcha-challenge', async (c) => {
    const secret = c.get('deps').env.ALTCHA_HMAC_KEY;
    if (!secret) throw new ConfigurationError(['ALTCHA_HMAC_KEY']);
    c.header('Cache-Control', 'no-store');
    return c.json(await newChallenge(secret, c.get('deps').now()));
  })
  .get('/config', async (c) => {
  const { config, db } = c.get('deps');
  const s = productConfig.limits.search;
  // Lowered while the look-to-book watch throttles; without a database the configured value.
  let maxCombinations = s.max_combinations;
  try {
    maxCombinations = await effectiveMaxCombinations(db());
  } catch {
    // keep the configured maximum
  }
  // Destination countries come from the catalog; without a readable catalog the picker stays hidden.
  let countries: MetaConfigResponse['countries'] = [];
  try {
    countries = destinationCountryOptions(await listCatalogCountries(db(), { includeDrafts: config.CATALOG_ALLOW_DRAFTS }));
  } catch {
    // no picker
  }
  const body: MetaConfigResponse = {
    app_env: config.APP_ENV,
    providers_mode: config.PROVIDERS_MODE,
    llm_enabled: await effectiveLlmEnabled(db(), config).catch(() => config.LLM_ENABLED),
    payment_mode: config.LITEAPI_PAYMENT_MODE,
    booking_enabled: config.BOOKING_ENABLED,
    provider_sources: configuredSources(config),
    end_user_view: endUserView(c.req.header(ROLE_HEADER)),
    dev_settings: devSettingsAllowed(config) && !endUserView(c.req.header(ROLE_HEADER)),
    catalog_drafts: config.CATALOG_ALLOW_DRAFTS,
    chips: CHIPS.map((chip) => ({ code: chip.code, label: chip.label })),
    themes: THEME_CODES.map((code) => ({ code, label: THEME_LABELS[code] })),
    countries,
    limits: {
      max_places: s.max_places,
      max_dates: s.max_dates,
      max_combinations: maxCombinations,
      max_nights: s.max_nights,
      max_rooms: s.max_rooms,
      max_adults_per_room: s.max_adults_per_room,
      max_children_per_room: s.max_children_per_room,
      max_window_days: s.max_window_days,
      wish_text_max_chars: constants.WISH_TEXT_MAX_CHARS,
    },
    ai_labels: { ...productConfig.compliance.ai_labels },
    attribution: productConfig.attribution.map((a) => ({ id: a.id, text: a.text, license: a.license, source_url: a.source_url })),
  };
  return c.json(body);
});
