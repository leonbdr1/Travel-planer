import { z } from 'zod';

export const metaConfigResponseSchema = z.object({
  app_env: z.enum(['dev', 'test', 'staging', 'production']),
  providers_mode: z.enum(['fake', 'sandbox', 'live']),
  llm_enabled: z.boolean(),
  payment_mode: z.enum(['sandbox', 'live']),
});
export type MetaConfigResponse = z.infer<typeof metaConfigResponseSchema>;
