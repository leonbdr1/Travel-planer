// YAML format of the place catalog (data/catalog, see its README).
import { CATALOG_COUNTRIES, type CatalogCountry } from '@reiseplaner/domain';
import { z } from 'zod';

export const catalogCountries = CATALOG_COUNTRIES;
export type { CatalogCountry };

export const themeSchema = z.strictObject({
  code: z.string().regex(/^[a-z][a-z_]*$/),
  label_de: z.string().min(1),
  category: z.enum(['landschaft', 'aktivitaet', 'kultur', 'erholung']),
});
export type CatalogTheme = z.infer<typeof themeSchema>;

export const regionSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  country: z.enum(catalogCountries),
  description_de: z.string().min(1).max(200),
  themes: z.array(z.string()).min(1),
  source: z.enum(['ai', 'manual']).default('ai'),
  ai_assisted: z.boolean().default(true),
  verified: z.boolean().default(false),
});
export type CatalogRegion = z.infer<typeof regionSchema>;

export const placeSchema = z.strictObject({
  name: z.string().min(1),
  match_name: z.string().min(1).optional(),
  // GeoNames admin1 code; YAML may parse unquoted digits as numbers.
  admin1: z
    .union([z.string().min(1), z.int().min(0)])
    .transform((v) => (typeof v === 'number' ? String(v).padStart(2, '0') : v))
    .optional(),
  geonameid: z.int().positive().optional(),
  themes: z.record(z.string(), z.int().min(1).max(3)),
  description_de: z.string().min(1).max(160),
  search_radius_km: z.number().positive().max(50).default(10),
  ai_assisted: z.boolean(),
  verified: z.boolean(),
});
export type CatalogPlace = z.infer<typeof placeSchema>;

export const placesFileSchema = z.strictObject({
  region: z.string(),
  places: z.array(placeSchema),
});
