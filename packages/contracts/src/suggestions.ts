import { z } from 'zod';

const themeCode = z.string().regex(/^[a-z][a-z_]*$/).max(40);
/** Largest selectable maximum drive time, 30 h (Aufgabe F16); equals MAX_DRIVE_MINUTES in packages/domain (drift test in packages/web). */
export const MAX_DRIVE_MINUTES = 1800;

/** Continents of the flight mode (Aufgabe F19); equal to CONTINENT_CODES in packages/domain (drift test in packages/web). */
export const CONTINENT_CODES = ['europa', 'afrika', 'asien', 'nordamerika', 'suedamerika', 'ozeanien'] as const;
export const travelModeSchema = z.enum(['car', 'flight']);
export type TravelModeDto = z.infer<typeof travelModeSchema>;

/**
 * How the traveller gets there (F19): by car (max_drive_minutes) or by plane
 * (continents, optional max_flight_minutes; shown only, no flight is sold).
 */
const travelFields = {
  travel_mode: travelModeSchema.default('car'),
  /** Flight mode: ticked continents; empty means all. */
  continents: z.array(z.enum(CONTINENT_CODES)).max(6).default([]),
  /** Flight mode: optional limit of the flight time (air distance estimate). */
  max_flight_minutes: z.number().int().min(30).max(1200).nullable().default(null),
  /** Destination countries ("Spanien", F20) as catalog country codes; empty means every country. */
  countries: z.array(z.string().regex(/^[A-Z]{2}(-[A-Z]{2})?$/)).max(30).default([]),
};

export const originRefSchema = z.object({ geonameid: z.number().int().positive() });

export const regionSuggestionsRequestSchema = z.object({
  origin: originRefSchema,
  max_drive_minutes: z.number().int().min(15).max(MAX_DRIVE_MINUTES).nullable(),
  themes: z.array(themeCode).max(12),
  ...travelFields,
});
export type RegionSuggestionsRequest = z.infer<typeof regionSuggestionsRequestSchema>;

export const originSchema = z.object({ geonameid: z.number().int(), label: z.string(), lat: z.number(), lng: z.number() });

export const travelStatsSchema = z.object({ cached: z.number().int(), routed: z.number().int(), estimated: z.number().int() });

/** What a traveller can do in a place (Aufgabe 8, docs/logik/orts-attraktivitaet.md). */
export const attractivenessSchema = z.object({
  score: z.number(),
  level: z.enum(['top', 'beliebt', 'ruhig', 'wenig']),
  parts: z.object({ fame: z.number(), attractions: z.number(), trails: z.number(), variety: z.number(), infrastructure: z.number() }),
});
export type AttractivenessDto = z.infer<typeof attractivenessSchema>;

export const regionSuggestionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  /** Card title (Aufgabe F17): the only highlight place of the region ("Venedig"), else the region name. */
  title: z.string().default(''),
  /** That highlight place, null when the title is the region name. */
  highlight_place: z.string().nullable().default(null),
  description: z.string(),
  ai_assisted: z.boolean(),
  verified: z.boolean(),
  reason: z.string(),
  score: z.number(),
  places: z.number().int(),
  min_minutes: z.number().int(),
  max_minutes: z.number().int(),
  estimated: z.boolean(),
  /** Rough centre of the region's places, for the orientation map (Aufgabe 13). */
  center: z.object({ lat: z.number(), lng: z.number() }).nullable().default(null),
  /** The region by its best places (Aufgabe 8). */
  attractiveness: z
    .object({ score: z.number(), level: z.enum(['top', 'beliebt', 'ruhig', 'wenig']), top_places: z.array(z.string()) })
    .nullable()
    .default(null),
});
export type RegionSuggestionDto = z.infer<typeof regionSuggestionSchema>;

export const regionSuggestionsResponseSchema = z.object({
  origin: originSchema,
  regions: z.array(regionSuggestionSchema),
  travel_times: travelStatsSchema,
  /** true when distant places were left out because only well-known destinations count that far (F19). */
  quality_filter: z.boolean().default(false),
});
export type RegionSuggestionsResponse = z.infer<typeof regionSuggestionsResponseSchema>;

export const placeSuggestionsRequestSchema = z.object({
  origin: originRefSchema,
  max_drive_minutes: z.number().int().min(15).max(MAX_DRIVE_MINUTES).nullable(),
  themes: z.array(themeCode).max(12),
  region_ids: z.array(z.uuid()).min(1).max(5),
  ...travelFields,
});
export type PlaceSuggestionsRequest = z.infer<typeof placeSuggestionsRequestSchema>;

export const placeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['catalog', 'user']),
  /** GeoNames id of the place: resolves it again with another start location (manual place choice). */
  geonameid: z.number().int().nullable().default(null),
  region_id: z.string().nullable(),
  region_name: z.string().nullable(),
  country_code: z.string(),
  description: z.string().nullable(),
  ai_assisted: z.boolean(),
  verified: z.boolean(),
  themes: z.array(z.object({ code: z.string(), label: z.string(), strength: z.number().int() })),
  matched_themes: z.array(z.string()),
  minutes: z.number().int().nullable(),
  estimated: z.boolean(),
  attractiveness: attractivenessSchema.nullable().default(null),
});
export type PlaceDto = z.infer<typeof placeDtoSchema>;

export const placeSuggestionsResponseSchema = z.object({
  regions: z.array(z.object({ id: z.string(), name: z.string(), places: z.array(placeDtoSchema) })),
  travel_times: travelStatsSchema,
});
export type PlaceSuggestionsResponse = z.infer<typeof placeSuggestionsResponseSchema>;
