import { z } from 'zod';
import { goalSchema, searchRequestSchema } from './searches';
import { attractivenessSchema } from './suggestions';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Sort keys of the list; `drive`: nearest place first (drive time from the start location). */
export const resultSortSchema = z.enum(['best', 'price', 'quality', 'drive']);
export type ResultSort = z.infer<typeof resultSortSchema>;

export const resultsQuerySchema = z.object({
  /** price: cheapest first (default); best: by comparison price; quality: best score first; drive: nearest place first. */
  sort: resultSortSchema.default('price'),
  /** The goal whose rules decide which houses the list and the matrix show (default: the search's goal). */
  goal: goalSchema.optional(),
  budget: z.string().optional(),
  min_stars: z.string().optional(),
  min_rating: z.string().optional(),
  min_reviews: z.string().optional(),
  refundable: z.enum(['true', 'false']).optional(),
  board: z.string().optional(),
  /** Kinds (hotel, pension, ferienwohnung) or the provider's raw types, comma-separated. */
  types: z.string().optional(),
  chips: z.string().optional(),
  /** Part of the name: narrows the lists (not the matrix). */
  q: z.string().max(80).optional(),
  /** Page of the list: without `limit` the whole list (as before). */
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  place_id: z.string().optional(),
  checkin: isoDate.optional(),
  /** With a night range the cell is (place, arrival, departure). */
  checkout: isoDate.optional(),
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

/** A praise label such as "Gutes Frühstück" (konzept.md 9.11), counted from reviews without AI. */
export const praiseLabelSchema = z.object({ topic: z.string(), label: z.string() });
export type PraiseLabelDto = z.infer<typeof praiseLabelSchema>;

/** Evidence line of the detail view: "Frühstück: 23× gelobt, 2× kritisiert". */
export const praiseCountSchema = z.object({ topic: z.string(), label: z.string(), praised: z.number().int(), criticized: z.number().int() });

export const reviewCheckSchema = z.object({
  status: z.enum(['ok', 'no_reviews', 'skipped_budget', 'failed']),
  /** The skill checked keyword hits (label as AI-assisted analysis). */
  ai_assisted: z.boolean(),
  reviews_checked: z.number().int(),
  recent_rating: z.number().nullable(),
  recent_count: z.number().int(),
  warnings: z.array(warningSchema),
  labels: z.array(praiseLabelSchema),
  praise: z.array(praiseCountSchema),
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
  /** Aufgabe 5: the room fits the party, or it is clearly larger than needed (shown, outside the price formation). */
  room_fit: z.enum(['fits', 'oversized']).default('fits'),
  room_capacity: z.number().int().nullable().default(null),
  /** Every room of the house on this date with its cheapest price (on the cheapest offer of a date). */
  room_options: z
    .array(z.object({ room_name: z.string(), total_eur: z.number(), capacity: z.number().int().nullable(), fit: z.enum(['fits', 'oversized']) }))
    .default([]),
});
export type OfferDto = z.infer<typeof offerDtoSchema>;

export const hotelSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  stars: z.number().nullable(),
  rating: z.number().nullable(),
  review_count: z.number().int().nullable(),
  /** Names of external rating sources fused into `rating` and `review_count` (empty: LiteAPI only). */
  rating_sources: z.array(z.string()).default([]),
  hotel_type: z.string().nullable(),
  city: z.string().nullable(),
  photo_url: z.string().nullable(),
});

export const qualityDtoSchema = z.object({
  score: z.number().nullable(),
  checked: z.boolean(),
  no_reviews: z.boolean(),
  /** Why our score differs from the guest rating (Aufgabe 7): kind, the review count from which the rating counts fully, and the steps. */
  property_kind: z.enum(['hotel', 'pension', 'ferienwohnung']).default('hotel'),
  full_weight_reviews: z.number().default(30),
  /** Effective reviews below full_weight_reviews: the rating was pulled towards the overall mean. */
  prior_applied: z.boolean().default(false),
  /** Change by recent reviews (s1 − s0), 0 without. */
  recency_delta: z.number().default(0),
  /** Change by the cleanliness value (s2 − s1), 0 without. */
  cleanliness_delta: z.number().default(0),
  /** Deduction for confirmed complaints. */
  penalty: z.number().default(0),
});

/** One night more of the same stay (Aufgabe 4, docs/logik/flexible-naechte.md). */
export const extraNightSchema = z.object({
  from_nights: z.number().int(),
  to_nights: z.number().int(),
  longer_offer_id: z.string(),
  extra_eur: z.number(),
  nightly_eur: z.number(),
  verdict: z.enum(['cheap', 'normal', 'expensive']),
});
export type ExtraNightDto = z.infer<typeof extraNightSchema>;

export const resultItemSchema = z.object({
  hotel: hotelSummarySchema,
  best_offer: offerDtoSchema,
  other_dates_count: z.number().int(),
  quality: qualityDtoSchema,
  warnings: z.array(warningSchema),
  review_status: z.enum(['none', 'ok', 'unverified']),
  /** Reviews analysed by the review check, null without a check. */
  reviews_checked: z.number().int().nullable(),
  /** Praise labels, the most praised first (the list shows the first few). */
  labels: z.array(praiseLabelSchema),
  /** Lowest comparison price among the listed houses (cheapest unless a little more buys proven advantages). */
  recommended: z.boolean(),
  /** What one night more of the shown offer costs (only with a night range and a longer offer of the same kind). */
  extra_night: extraNightSchema.nullable().default(null),
});
export type ResultItem = z.infer<typeof resultItemSchema>;

/**
 * A house without reviews the goal's rules sort out (Ben, 2026-09-29): listed
 * apart below all offers so the traveller can decide; never in the finale or
 * the recommendation. `goal`: the goal needs confirmed quality; `no_reference`:
 * too few rated houses to compare; `cheap`: far below the rated houses of its
 * kind; `extras`: more extras than most at a lower price.
 */
export const unratedDoubtSchema = z.object({
  code: z.enum(['goal', 'no_reference', 'cheap', 'extras']),
  /** Median price per night of the rated houses it was compared with. */
  reference_per_night_eur: z.number().nullable(),
});
export type UnratedDoubtDto = z.infer<typeof unratedDoubtSchema>;

export const unratedItemSchema = resultItemSchema.extend({ doubt: unratedDoubtSchema });
export type UnratedItem = z.infer<typeof unratedItemSchema>;

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
  /** The house and room behind the price, for the hover text of the cell. */
  hotel_name: z.string().nullable(),
  room_name: z.string().nullable(),
  board_type: z.enum(['RO', 'BB', 'HB', 'FB', 'AI', 'OTHER']).nullable(),
  /** Why the offer is a bargain (the text template of 6.8), null without one. */
  bargain_reason: z.string().nullable(),
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
  /** The search frame as sent, so the same search can run again with fresh prices. */
  request: searchRequestSchema,
  matrix: z.object({
    places: z.array(
      z.object({ id: z.string(), name: z.string(), drive_minutes: z.number().int().nullable(), attractiveness: attractivenessSchema.nullable().default(null) }),
    ),
    dates: z.array(z.object({ checkin: isoDate, checkout: isoDate })),
    cells: z.array(matrixCellSchema),
  }),
  items: z.array(resultItemSchema),
  /** Sorted-out houses without reviews, cheapest first, in the same scope as `items`. */
  unrated: z.array(unratedItemSchema),
  /** Houses with only rooms clearly larger than the party (Aufgabe 5): shown apart, outside the price formation. */
  oversized: z.array(resultItemSchema).default([]),
  counts: z.object({
    offers: z.number().int(),
    passing: z.number().int(),
    hotels: z.number().int(),
    bargains: z.number().int(),
    /** Houses that pass the goal's rules: the list (without a cell filter) and the matrix. */
    listed: z.number().int(),
    /** Houses passing the filters that the goal's rules sort out; the list and the matrix leave them out. */
    hidden: z.number().int(),
    /** Of these, houses without reviews (listed apart in `unrated`). */
    unrated_hidden: z.number().int(),
  }),
  /** The page of `items`: `total` houses in the list, `limit` null = all at once. */
  page: z.object({ offset: z.number().int(), limit: z.number().int().nullable(), total: z.number().int() }),
  meta: z.object({
    prices_fetched_at: z.string().nullable(),
    sort: resultSortSchema,
    goal: goalSchema,
    cell: z.object({ place_id: z.string(), checkin: isoDate, checkout: isoDate.nullable().default(null) }).nullable(),
  }),
  /** With a night range: how the extra nights of the listed houses compare (null without one). */
  nights_summary: z
    .object({
      from_nights: z.number().int(),
      to_nights: z.number().int(),
      houses: z.number().int(),
      cheap: z.number().int(),
      normal: z.number().int(),
      expensive: z.number().int(),
      median_extra_eur: z.number(),
      median_nightly_eur: z.number(),
    })
    .nullable()
    .default(null),
});
export type SearchResultsResponse = z.infer<typeof searchResultsResponseSchema>;

export const scoreBreakdownSchema = z.object({
  /** Kind of accommodation and the review count from which its rating counts fully (Aufgabe 6). */
  propertyKind: z.enum(['hotel', 'pension', 'ferienwohnung']).default('hotel'),
  fullWeightReviews: z.number().default(30),
  rating: z.number().nullable(),
  reviewCount: z.number(),
  effectiveReviews: z.number(),
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

/** Provider text as plain blocks (domain/rich-text.ts): never markup. */
export const textBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('heading'), text: z.string() }),
  z.object({ kind: z.literal('paragraph'), text: z.string() }),
  z.object({ kind: z.literal('list'), items: z.array(z.string()) }),
]);
export type TextBlockDto = z.infer<typeof textBlockSchema>;

/** Guessed language of a provider text: `en` when the provider had no German text; null when unknown. */
const textLanguageSchema = z.enum(['de', 'en']).nullable();

export const hotelDetailResponseSchema = z.object({
  hotel: hotelSummarySchema.extend({
    address: z.string().nullable(),
    description: z.array(textBlockSchema),
    description_language: textLanguageSchema,
    photos: z.array(z.string()),
    /** Facilities in German (Aufgabe 12), flat and in groups; names we cannot translate are only counted. */
    facilities: z.array(z.string()),
    facility_groups: z
      .array(
        z.object({
          group: z.enum(['internet', 'parken', 'essen', 'wellness', 'draussen', 'aktivitaeten', 'zimmer', 'service', 'familie', 'barrierefrei']),
          labels: z.array(z.string()),
        }),
      )
      .default([]),
    facilities_untranslated: z.number().int().default(0),
    checkin_time: z.string().nullable(),
    checkout_time: z.string().nullable(),
    important_information: z.array(textBlockSchema),
    important_information_language: textLanguageSchema,
  }),
  score: scoreBreakdownSchema,
  offers: z.array(offerDtoSchema),
  review_check: reviewCheckSchema.nullable(),
  /** Occupancy of the search (the booking form asks one guest name per room). */
  occupancy: z.object({ rooms: z.number().int(), adults: z.number().int(), children: z.number().int() }),
});
export type HotelDetailResponse = z.infer<typeof hotelDetailResponseSchema>;

/**
 * GET /searches/{id}/finale?goal=&… (konzept.md 9.9, 9.10; architektur.md
 * 6.15): the same filter parameters as the results, plus the goal. Without a
 * goal the search's own goal applies.
 */
export const finaleQuerySchema = resultsQuerySchema.pick({
  budget: true,
  min_stars: true,
  min_rating: true,
  min_reviews: true,
  refundable: true,
  board: true,
  types: true,
  chips: true,
  goal: true,
});

export const offerFeatureSchema = z.object({ code: z.string(), label: z.string(), minutes: z.number().int().optional(), count: z.number().int().optional() });
export type OfferFeatureDto = z.infer<typeof offerFeatureSchema>;

export const exclusionReasonSchema = z.enum(['filters', 'no_reviews', 'red_flag', 'star_trap', 'low_quality', 'too_expensive', 'dominated']);
export type ExclusionReasonCode = z.infer<typeof exclusionReasonSchema>;

export const finalistSchema = z.object({
  hotel: hotelSummarySchema,
  offer: offerDtoSchema,
  quality: qualityDtoSchema,
  warnings: z.array(warningSchema),
  review_status: z.enum(['none', 'ok', 'unverified']),
  labels: z.array(praiseLabelSchema),
  /** Everything the offer brings (facilities, meals, free cancellation, praise labels). */
  features: z.array(offerFeatureSchema),
  /** Surcharge against the cheapest finalist; 0 for the cheapest itself. */
  price_delta_eur: z.number(),
  /** Brings, compared with the cheapest finalist. */
  gains: z.array(offerFeatureSchema),
  /** Lacks, compared with the cheapest finalist. */
  losses: z.array(offerFeatureSchema),
  /** Quality difference to the cheapest finalist, only when large enough to mention. */
  quality_delta: z.number().nullable(),
  other_place: z.boolean(),
  other_dates: z.boolean(),
  center_distance_km: z.number().nullable(),
  location: z.enum(['kern', 'ort', 'ausserhalb']).nullable(),
  /** Lowest comparison price of the finalists: the recommendation; the order stays by price. */
  recommended: z.boolean(),
});
export type FinalistDto = z.infer<typeof finalistSchema>;

export const finaleResponseSchema = z.object({
  search: z.object({ id: z.string(), status: z.enum(['queued', 'running', 'reviewing', 'done', 'partial', 'failed']) }),
  goal: goalSchema,
  filters: effectiveFiltersSchema,
  /** At most five, one offer per house, the cheapest first; one of them marked as recommendation. */
  finalists: z.array(finalistSchema),
  /** Houses the program sorted out, per reason (a house counts for its first reason). */
  excluded: z.record(exclusionReasonSchema, z.number().int()),
  /** Houses that fit but did not make it into the finale. */
  runners_up: z.number().int(),
  /** Houses with at least one offer in the search. */
  hotels: z.number().int(),
});
export type FinaleResponse = z.infer<typeof finaleResponseSchema>;

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
