import { z } from 'zod';

export const metaConfigResponseSchema = z.object({
  app_env: z.enum(['dev', 'test', 'staging', 'production']),
  providers_mode: z.enum(['fake', 'sandbox', 'live']),
  llm_enabled: z.boolean(),
  payment_mode: z.enum(['sandbox', 'live']),
  catalog_drafts: z.boolean(),
  chips: z.array(z.object({ code: z.string(), label: z.string() })),
  themes: z.array(z.object({ code: z.string(), label: z.string() })),
  limits: z.object({
    max_places: z.number().int(),
    max_dates: z.number().int(),
    max_combinations: z.number().int(),
    max_nights: z.number().int(),
    max_rooms: z.number().int(),
    max_adults_per_room: z.number().int(),
    max_children_per_room: z.number().int(),
    max_window_days: z.number().int(),
    wish_text_max_chars: z.number().int(),
  }),
  ai_labels: z.record(z.string(), z.string()),
  attribution: z.array(z.object({ id: z.string(), text: z.string(), license: z.string(), source_url: z.string() })),
});
export type MetaConfigResponse = z.infer<typeof metaConfigResponseSchema>;
