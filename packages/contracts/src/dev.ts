// Developer page (S11.8): local switches while testing. Only served in dev
// and test; staging and production answer 404.
import { z } from 'zod';

export const devSettingsResponseSchema = z.object({
  ai: z.object({
    /** LLM_ENABLED: the AI may run at all. */
    available: z.boolean(),
    /** Real model (costs on the Anthropic account) or the simulated one. */
    source: z.enum(['fake', 'real']),
    /** As switched on this page; null = never switched (real: off, simulated: on). */
    switched: z.boolean().nullable(),
    /** What the review check and the wish parser use now. */
    enabled: z.boolean(),
    /** AI costs today and the daily cap, in USD. */
    spent_today_usd: z.number(),
    daily_budget_usd: z.number(),
  }),
  limits: z.object({ searches_per_hour: z.number().int(), searches_per_day: z.number().int() }),
});
export type DevSettingsResponse = z.infer<typeof devSettingsResponseSchema>;

export const devSettingsUpdateSchema = z.strictObject({ ai_enabled: z.boolean() });
export type DevSettingsUpdate = z.infer<typeof devSettingsUpdateSchema>;
