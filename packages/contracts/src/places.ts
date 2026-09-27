import { z } from 'zod';
import { localitySchema } from './geo';
import { placeDtoSchema } from './suggestions';

export const placeSearchQuerySchema = z.union([
  z.object({ q: z.string().trim().min(2).max(60), origin: z.coerce.number().int().positive().optional() }),
  z.object({ geonameid: z.coerce.number().int().positive(), origin: z.coerce.number().int().positive().optional() }),
]);

export const placeSearchResponseSchema = z.object({
  catalog: z.array(placeDtoSchema),
  localities: z.array(localitySchema),
});
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>;

export const placeResolveResponseSchema = z.object({ place: placeDtoSchema });
export type PlaceResolveResponse = z.infer<typeof placeResolveResponseSchema>;
