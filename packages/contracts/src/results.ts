import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const resultsQuerySchema = z.object({
  sort: z.enum(['best', 'price', 'quality']).default('best'),
  budget: z.string().optional(),
  min_stars: z.string().optional(),
  min_rating: z.string().optional(),
  min_reviews: z.string().optional(),
  refundable: z.enum(['true', 'false']).optional(),
  board: z.string().optional(),
  types: z.string().optional(),
  chips: z.string().optional(),
  place_id: z.string().optional(),
  checkin: isoDate.optional(),
});

export const effectiveFiltersSchema = z.object({
  budget_total_eur: z.number().nullable(),
  min_stars: z.number().nullable(),
  min_rating: z.number().nullable(),
  min_reviews: z.number().nullable(),
  property_types: z.array(z.string()),
  refundable_only: z.boolean(),
  board: z.enum(['RO', 'BB', 'HB', 'FB', 'AI', 'OTHER']).nullable(),
  chips: z.array(z.string()),
});
export type EffectiveFilters = z.infer<typeof effectiveFiltersSchema>;

export const warningSchema = z.object({
  topic: z.string(),
  label: z.string(),
  count: z.number().int(),
  recent_count: z.number().int(),
  latest_date: z.string().nullable(),
  verified: z.boolean(),
  severity: z.enum(['low', 'medium', 'high']).nullable(),
  /** `ai_assisted` for warnings the skill confirmed; null for unverified keyword hints. */
  ai_provenance: z.literal('ai_assisted').nullable(),
});
export type WarningDto = z.infer<typeof warningSchema>;

export const reviewCheckSchema = z.object({
  status: z.enum(['ok', 'no_reviews', 'skipped_budget', 'failed']),
  /** The skill checked keyword hits (label as AI-assisted analysis). */
  ai_assisted: z.boolean(),
  reviews_checked: z.number().int(),
  recent_rating: z.number().nullable(),
  recent_count: z.number().int(),
  warnings: z.array(warningSchema),
  checked_at: z.string(),
});
export type ReviewCheckDto = z.infer<typeof reviewCheckSchema>;

export const offerDtoSchema = z.object({
  id: z.string(),
  hotel_id: z.string(),
  place_id: z.string(),
  place_name: z.string(),
  checkin: isoDate,
  checkout: isoDate,
  nights: z.number().int(),
  kind: z.enum(['cheapest', 'cheapest_refundable']),
  room_name: z.string(),
  board_type: z.enum(['RO', 'BB', 'HB', 'FB', 'AI', 'OTHER']),
  refundable: z.boolean(),
  free_cancel_until: z.string().nullable(),
  total_price_eur: z.number(),
  price_per_night_eur: z.number(),
  pay_at_property_eur: z.number(),
  pay_at_property_known: z.boolean(),
  passes_filters: z.boolean(),
  bargain: z.object({ types: z.array(z.enum(['value', 'date', 'place'])), reason: z.string() }).nullable(),
  rank_score: z.number(),
});
export type OfferDto = z.infer<typeof offerDtoSchema>;

export const hotelSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  stars: z.number().nullable(),
  rating: z.number().nullable(),
  review_count: z.number().int().nullable(),
  hotel_type: z.string().nullable(),
  city: z.string().nullable(),
  photo_url: z.string().nullable(),
});

export const qualityDtoSchema = z.object({ score: z.number().nullable(), checked: z.boolean(), no_reviews: z.boolean() });

export const resultItemSchema = z.object({
  hotel: hotelSummarySchema,
  best_offer: offerDtoSchema,
  other_dates_count: z.number().int(),
  quality: qualityDtoSchema,
  warnings: z.array(warningSchema),
  review_status: z.enum(['none', 'ok', 'unverified']),
  /** Reviews analysed by the review check, null without a check. */
  reviews_checked: z.number().int().nullable(),
});
export type ResultItem = z.infer<typeof resultItemSchema>;

export const matrixCellSchema = z.object({
  place_id: z.string(),
  checkin: isoDate,
  checkout: isoDate,
  state: z.enum(['pending', 'offer', 'empty', 'failed']),
  offer_id: z.string().nullable(),
  hotel_id: z.string().nullable(),
  total_price_eur: z.number().nullable(),
  price_bucket: z.number().int().nullable(),
  bargain: z.boolean(),
});
export type MatrixCellDto = z.infer<typeof matrixCellSchema>;

export const searchResultsResponseSchema = z.object({
  search: z.object({
    id: z.string(),
    status: z.enum(['queued', 'running', 'reviewing', 'done', 'partial', 'failed']),
    combos_total: z.number().int(),
    combos_done: z.number().int(),
    combos_failed: z.number().int(),
  }),
  filters: effectiveFiltersSchema,
  matrix: z.object({
    places: z.array(z.object({ id: z.string(), name: z.string(), drive_minutes: z.number().int().nullable() })),
    dates: z.array(z.object({ checkin: isoDate, checkout: isoDate })),
    cells: z.array(matrixCellSchema),
  }),
  items: z.array(resultItemSchema),
  counts: z.object({ offers: z.number().int(), passing: z.number().int(), hotels: z.number().int(), bargains: z.number().int() }),
  meta: z.object({ prices_fetched_at: z.string().nullable(), sort: z.enum(['best', 'price', 'quality']), cell: z.object({ place_id: z.string(), checkin: isoDate }).nullable() }),
});
export type SearchResultsResponse = z.infer<typeof searchResultsResponseSchema>;

export const scoreBreakdownSchema = z.object({
  rating: z.number().nullable(),
  reviewCount: z.number(),
  priorMean: z.number(),
  priorWeight: z.number(),
  s0: z.number().nullable(),
  recency: z.object({ checked: z.boolean(), applied: z.boolean(), delta: z.number(), s1: z.number().nullable() }),
  cleanliness: z.object({ applied: z.boolean(), value: z.number().nullable(), weight: z.number(), s2: z.number().nullable() }),
  penalty: z.object({
    total: z.number(),
    items: z.array(z.object({ topic: z.string(), severity: z.enum(['low', 'medium', 'high']), weight: z.number() })),
  }),
  quality: z.number().nullable(),
});

export const hotelDetailResponseSchema = z.object({
  hotel: hotelSummarySchema.extend({
    address: z.string().nullable(),
    description: z.string().nullable(),
    photos: z.array(z.string()),
    facilities: z.array(z.string()),
    checkin_time: z.string().nullable(),
    checkout_time: z.string().nullable(),
    important_information: z.string().nullable(),
  }),
  score: scoreBreakdownSchema,
  offers: z.array(offerDtoSchema),
  review_check: reviewCheckSchema.nullable(),
});
export type HotelDetailResponse = z.infer<typeof hotelDetailResponseSchema>;

/** GET /searches/{id}/hotels/{hotel_id}/reference-price?offer_id= (architektur.md 7.2). */
export const referencePriceQuerySchema = z.object({
  offer_id: z.string().regex(/^\d{1,18}$/),
});

export const referencePriceResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    offer_id: z.string(),
    total_price_eur: z.number(),
    currency: z.string(),
    source: z.string(),
    fetched_at: z.string(),
  }),
  z.object({
    status: z.literal('unavailable'),
    offer_id: z.string(),
    reason: z.enum(['no_public_price', 'contract_unverified', 'quota', 'provider_error']),
  }),
]);
export type ReferencePriceResponse = z.infer<typeof referencePriceResponseSchema>;
