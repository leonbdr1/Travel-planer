import { z } from 'zod';

export const localitiesQuerySchema = z.object({ q: z.string().trim().min(2).max(60) });

export const localitySchema = z.object({
  geonameid: z.number().int(),
  name: z.string(),
  label: z.string(),
  admin_name: z.string().nullable(),
  country_code: z.string(),
  lat: z.number(),
  lng: z.number(),
  population: z.number().int(),
});
export type LocalityDto = z.infer<typeof localitySchema>;

export const localitiesResponseSchema = z.object({ items: z.array(localitySchema) });
export type LocalitiesResponse = z.infer<typeof localitiesResponseSchema>;
