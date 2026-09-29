import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const themeCode = z.string().regex(/^[a-z][a-z_]*$/).max(40);

/** Goal of the automatic pre-selection (konzept.md 9.9); the codes of GOALS in packages/domain. */
export const goalSchema = z.enum(['sparen', 'ausgewogen', 'komfort']);
export type GoalCode = z.infer<typeof goalSchema>;

/** SearchRequest (architektur.md 7.3). Product limits are enforced by the route. */
export const searchRequestSchema = z.object({
  /** Without a goal (searches before Fassung 4) the domain default applies. */
  goal: goalSchema.optional(),
  /** Empty when the traveller picked the places themselves: then there are no drive times. */
  origin: z.object({ geonameid: z.number().int().positive(), label: z.string().max(120), lat: z.number(), lng: z.number() }).nullable().default(null),
  max_drive_minutes: z.number().int().min(15).max(720).nullable(),
  themes: z.array(themeCode).max(12),
  window: z.object({ start: isoDate, end: isoDate }),
  nights: z.number().int().min(1).max(30),
  /** Longest stay of a night range ("2 bis 3 Nächte", Aufgabe 4); missing or null: exactly `nights`. */
  nights_max: z.number().int().min(1).max(30).nullable().optional(),
  arrival_weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  occupancy: z.object({
    rooms: z.number().int().min(1).max(10),
    adults: z.number().int().min(1).max(40),
    children_ages: z.array(z.number().int().min(0).max(17)).max(20),
  }),
  budget_total_eur: z.number().int().positive().max(1_000_000).nullable(),
  filters: z.object({
    min_stars: z.number().min(1).max(5).nullable(),
    min_rating: z.number().min(0).max(10).nullable(),
    min_reviews: z.number().int().min(0).max(10_000).nullable(),
    property_types: z.array(z.string().max(40)).max(10),
    refundable_only: z.boolean(),
    board: z.enum(['RO', 'BB', 'HB', 'FB', 'AI']).nullable(),
  }),
  chips: z.array(z.string().regex(/^[a-z][a-z_]*$/).max(40)).max(20),
  place_ids: z.array(z.uuid()).min(1).max(50),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const createSearchRequestSchema = searchRequestSchema.extend({ altcha: z.string().min(10).max(4000) });
export type CreateSearchRequest = z.infer<typeof createSearchRequestSchema>;

export const createSearchResponseSchema = z.object({ search_id: z.uuid(), token: z.string().min(20) });
export type CreateSearchResponse = z.infer<typeof createSearchResponseSchema>;

export const searchStatusSchema = z.enum(['queued', 'running', 'reviewing', 'done', 'partial', 'failed']);

export const searchCellSchema = z.object({
  place_id: z.string(),
  checkin: isoDate,
  checkout: isoDate,
  state: z.enum(['pending', 'offer', 'no_offer', 'failed']),
  offers_count: z.number().int(),
  min_total_eur: z.number().nullable(),
});
export type SearchCell = z.infer<typeof searchCellSchema>;

export const searchProgressResponseSchema = z.object({
  search: z.object({
    id: z.string(),
    status: searchStatusSchema,
    combos_total: z.number().int(),
    combos_done: z.number().int(),
    combos_failed: z.number().int(),
    created_at: z.string(),
    started_at: z.string().nullable(),
    finished_at: z.string().nullable(),
  }),
  places: z.array(z.object({ id: z.string(), name: z.string(), drive_minutes: z.number().int().nullable(), source: z.enum(['suggested', 'user']) })),
  dates: z.array(z.object({ checkin: isoDate, checkout: isoDate })),
  cells: z.array(searchCellSchema),
  offers_count: z.number().int(),
});
export type SearchProgressResponse = z.infer<typeof searchProgressResponseSchema>;

export const altchaChallengeSchema = z.object({
  parameters: z.object({
    algorithm: z.string(),
    nonce: z.string(),
    salt: z.string(),
    cost: z.number(),
    keyLength: z.number(),
    keyPrefix: z.string(),
    expiresAt: z.number().optional(),
  }).loose(),
  signature: z.string().optional(),
});
export type AltchaChallenge = z.infer<typeof altchaChallengeSchema>;
