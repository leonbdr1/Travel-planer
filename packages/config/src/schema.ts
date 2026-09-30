import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'expected a hex color like #0f766e');
// Catalog country keys; identical to CATALOG_COUNTRIES in packages/domain (drift test in packages/cli).
const countryCode = z.enum([
  'DE', 'AT', 'CH', 'IT-BZ', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU', 'DK', 'CZ', 'PL', 'HU', 'HR', 'SI', 'SK', 'GR', 'GB', 'IE', 'NO', 'SE',
  'AL', 'AD', 'BA', 'BG', 'CY', 'EE', 'FI', 'IS', 'LV', 'LI', 'LT', 'MT', 'MC', 'ME', 'MK', 'RO', 'RS', 'TR',
]);
const positiveInt = z.int().positive();

export const productConfigSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  name_is_working_title: z.boolean(),
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  tagline: z.string().min(1),
  operator: z.strictObject({
    company: z.string().min(1),
    confirmed: z.boolean(),
    address_lines: z.array(z.string().min(1)).min(1),
    register_entry: z.string().min(1),
    vat_id: z.string().min(1),
    represented_by: z.string().min(1),
    contact_email: z.email(),
    role_statement: z.string().min(1),
  }),
  domains: z.strictObject({
    primary: z.string().min(3),
    staging: z.string().min(3),
  }),
  brand: z.strictObject({
    colors: z.strictObject({
      primary: hexColor,
      primary_contrast: hexColor,
      accent: hexColor,
      bargain: hexColor,
      warning: hexColor,
    }),
    fonts: z.strictObject({ sans: z.string().min(1) }),
    logo: z.string().startsWith('/'),
  }),
  markets: z.strictObject({
    language: z.literal('de'),
    currency: z.literal('EUR'),
    guest_nationality: z.string().regex(/^[A-Z]{2}$/),
    timezone: z.string().min(1),
    catalog_countries: z.array(countryCode).min(1),
  }),
  support: z.strictObject({
    email: z.email(),
    response_time_hours: positiveInt,
  }),
  /** Recipient of operational alerts (look-to-book watch, budgets, watchdog). */
  ops: z.strictObject({
    alert_email: z.email(),
    health_timeout_s: positiveInt,
    alert_cooldown_hours: positiveInt,
    /** Heartbeat jobs of the app worker (cron jobs, search workflow) and their maximum age. */
    heartbeat_max_age_min: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), positiveInt),
  }),
  /** Sender of transactional e-mails (Resend, architektur.md E10); replies go to support. */
  mail: z.strictObject({
    from_name: z.string().min(1),
    from_address: z.email(),
  }),
  compliance: z.strictObject({
    retention: z.strictObject({
      searches_days: positiveInt,
      ip_hash_days: positiveInt,
      guest_data_days_after_checkout: positiveInt,
    }),
    ai_labels: z.strictObject({
      review_analysis: z.string().min(1),
      catalog_description: z.string().min(1),
      catalog_description_draft: z.string().min(1),
      wish_parse: z.string().min(1),
    }),
    forbidden_claims: z.array(z.string().min(3)).min(1),
  }),
  attribution: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        text: z.string().min(1),
        license: z.string().min(1),
        license_url: z.url(),
        source_url: z.url(),
      }),
    )
    .min(1),
  limits: z.strictObject({
    search: z.strictObject({
      max_places: positiveInt,
      max_dates: positiveInt,
      max_combinations: positiveInt,
      max_nights: positiveInt,
      max_rooms: positiveInt,
      max_adults_per_room: positiveInt,
      max_children_per_room: z.int().min(0),
      max_window_days: positiveInt,
    }),
    rate_limits: z.strictObject({
      searches_per_hour: positiveInt,
      searches_per_day: positiveInt,
      wishes_per_hour: positiveInt,
      lookups_per_hour: positiveInt,
      access_link_per_hour: positiveInt,
      reference_price_per_minute: positiveInt,
      /** Coarse first stage per Cloudflare location (RATE_LIMITER binding), all API routes but health. */
      coarse_per_minute: positiveInt,
    }),
    /** Local dev and Testbetrieb only (APP_ENV=dev): higher search limits for trying things out. */
    dev_rate_limits: z.strictObject({
      searches_per_hour: positiveInt,
      searches_per_day: positiveInt,
    }),
    daily_quotas: z.strictObject({
      searches: positiveInt,
      liteapi_calls: positiveInt,
      ors_calls: positiveInt,
      rating_calls: positiveInt,
    }),
    llm_daily_budget_usd: z.number().positive(),
  }),
  ai: z.strictObject({
    batch_discount: z.number().gt(0).lte(1),
    eval_judge_model: z.string().min(1),
    models: z.record(
      z.string().min(1),
      z.strictObject({
        input_usd_per_mtok: z.number().positive(),
        output_usd_per_mtok: z.number().positive(),
        sampling_params: z.boolean(),
      }),
    ),
  }),
});

export type ProductConfig = z.infer<typeof productConfigSchema>;
