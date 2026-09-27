import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

/** 402 body for exhausted quotas or budgets (Frontlift pattern). */
export const quotaErrorSchema = z.object({
  reason: z.enum(['quota', 'budget']),
  cta: z.boolean(),
  message: z.string().optional(),
});
export type QuotaErrorResponse = z.infer<typeof quotaErrorSchema>;
