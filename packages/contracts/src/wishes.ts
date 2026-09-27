import { z } from 'zod';

export const wishParseRequestSchema = z.object({ text: z.string().trim().min(1).max(300) });
export type WishParseRequest = z.infer<typeof wishParseRequestSchema>;

export const wishParseResponseSchema = z.object({
  chips: z.array(z.string()),
  themes: z.array(z.string()),
  review_topics: z.array(z.string()),
  unmatched: z.array(z.string()),
  /** false: the AI translation was unavailable (fallback), the user picks chips by hand. */
  translated: z.boolean(),
  notice: z.string().nullable(),
});
export type WishParseResponse = z.infer<typeof wishParseResponseSchema>;
