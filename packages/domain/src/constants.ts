// Domain constants (architektur.md 6.14, start values; calibration in M6/M7).
// Product-level limits (search scope, rate limits, quotas, LLM budget) live in
// product.config.yaml; everything here is a technical or scoring constant.
// Domain functions take these as parameters so tests can vary them.

export const SEARCH_BLOCK_SIZE = 12;
export const SEARCH_JOB_TIMEOUT_S = 180;
export const LITEAPI_MAX_CONCURRENCY = 6;
export const LITEAPI_MAX_CONCURRENCY_SANDBOX = 4;
export const LITEAPI_RATES_TIMEOUT_S = 6;
export const LITEAPI_RATES_LIMIT = 200;
export const LITEAPI_MAX_RETRIES = 2;
export const RATE_CACHE_TTL_MIN = 30;
export const REFERENCE_PRICE_CACHE_TTL_H = 6;
export const HOTEL_CONTENT_TTL_DAYS = 7;
/** Step `hotel-content`: no new details calls after this long (the step times out at 60 s); houses left over stay unrated. */
export const HOTEL_CONTENT_STEP_BUDGET_S = 40;
export const TRAVEL_TIME_CACHE_TTL_DAYS = 180;

export const LOOK_TO_BOOK_ALERT = 3000;
export const LOOK_TO_BOOK_THROTTLE = 4500;
export const LOOK_TO_BOOK_WINDOW_DAYS = 7;
/** Maximum combinations for new searches while the look-to-book watch throttles. */
export const LOOK_TO_BOOK_THROTTLED_MAX_COMBINATIONS = 40;
/** Review invitations go out from the day after checkout, at most this many days late. */
export const REVIEW_INVITE_MAX_DELAY_DAYS = 14;

export const PREFILTER_KM_PER_MIN = 1.2;
export const ORIGIN_CELL_DEG = 0.02;
export const ORS_MATRIX_CHUNK = 50;
export const ORS_PER_MIN_CAP = 35;
/** Straight-line fallback: road factor and average speed for estimates. */
export const ESTIMATE_ROAD_FACTOR = 1.3;
export const ESTIMATE_AVG_SPEED_KMH = 70;

export const SUGGEST_MIN_REGIONS = 2;
export const SUGGEST_MAX_REGIONS = 5;
export const SUGGEST_MAX_PLACES_PER_REGION = 10;
export const THEME_MIN_STRENGTH = 2;
export const DEFAULT_SEARCH_RADIUS_KM = 10;

export const SCORE_PRIOR_MEAN = 7.5;
/**
 * From this many reviews the rating counts as it is (Ben, 2026-09-28: 69
 * reviews with 8.3 are solid); below, it is pulled towards SCORE_PRIOR_MEAN
 * by the missing reviews, so 3 reviews with 10.0 do not beat everything.
 */
export const SCORE_FULL_WEIGHT_REVIEWS = 30;
/**
 * Older reviews count less towards SCORE_FULL_WEIGHT_REVIEWS (Ben, 2026-09-28):
 * a review older than REVIEW_FRESH_MONTHS counts REVIEW_OLD_WEIGHT. Ages are
 * known for houses with a review check; reviews it did not load count as old.
 */
export const REVIEW_FRESH_MONTHS = 36;
export const REVIEW_OLD_WEIGHT = 1 / 3;
export const SCORE_RECENCY_WEIGHT = 0.5;
export const SCORE_RECENCY_MIN_COUNT = 5;
export const SCORE_RECENCY_DAMPING = 10;
export const SCORE_RECENCY_MAX_DELTA = 1.5;
export const SCORE_CLEANLINESS_WEIGHT = 0.2;
export const SCORE_CLEANLINESS_WEIGHT_CHIP = 0.35;
export const SCORE_MAX_PENALTY = 2.0;
export const SEVERITY_WEIGHTS = { low: 0.3, medium: 0.6, high: 1.0 } as const;
export const RECENT_REVIEW_MONTHS = 12;

/**
 * Bargains only by date (Ben, 2026-09-28): the same house clearly cheaper on
 * this date than on the traveller's other dates. The value and place marks
 * were dropped: with real prices nearly every offer carried one.
 */
export const BARGAIN_DATE_FACTOR = 0.8;
export const BARGAIN_DATE_MIN_DATES = 3;
/** Calibration target (umsetzungsplan S6.4): bargain share per type of F. */
export const CALIBRATION_BARGAIN_RATE_MIN = 0.05;
export const CALIBRATION_BARGAIN_RATE_MAX = 0.2;

export const RANK_W_QUALITY = 0.6;
export const RANK_W_PRICE = 0.4;
export const RANK_BARGAIN_BONUS = 0.05;
export const RANK_UNRATED_QUALITY_NORM = 0.5;

// Comparison price (Ben, 2026-09-28): lists and the finale go by price; the
// recommendation is the house with the lowest price / (1 + bonus), a bonus
// only for what is proven: many reviews, a better score, extras (komfort).
/** "Viele Bewertungen": a plus like a sauna; worth MANY_REVIEWS_BONUS of the price. */
export const MANY_REVIEWS_MIN = 500;
export const MANY_REVIEWS_BONUS = 0.05;
/** Worth of one quality point above the goal's floor, as a share of the price. */
export const GOAL_QUALITY_BONUS_PER_POINT = { sparen: 0.02, ausgewogen: 0.05, komfort: 0.1 } as const;
/** Only for "komfort": each extra (breakfast, half board, sauna, pool), capped. */
export const KOMFORT_EXTRA_BONUS = 0.03;
export const KOMFORT_EXTRAS_BONUS_MAX = 0.12;

// Decision aid (konzept.md 9.9–9.11): values decided with Ben on 2026-09-28,
// to be calibrated with real data in the Testbetrieb.
/** Minimum quality score per goal; below it a house is "zu schwach bewertet für dein Ziel". */
export const GOAL_QUALITY_FLOOR = { sparen: 7.0, ausgewogen: 7.5, komfort: 8.3 } as const;
/** Price window above the cheapest remaining house per goal (share of its total price); null = budget only. */
export const GOAL_PRICE_WINDOW = { sparen: 0.35, ausgewogen: 0.75, komfort: null } as const;
/**
 * Exception to the quality floor (not for "komfort"): a checked house without
 * red flags scoring at least this much stays in when it costs at most
 * LOW_QUALITY_EXCEPTION_PRICE_RATIO of the cheapest house meeting the floor.
 */
export const LOW_QUALITY_EXCEPTION_MIN = 6.5;
export const LOW_QUALITY_EXCEPTION_PRICE_RATIO = 0.75;
/** At most this many finalists, one offer per house. */
export const FINALISTS_MAX = 5;
/**
 * Houses without reviews: at most this many in the finale, marked. Out when
 * the price per night is below UNRATED_MIN_PRICE_RATIO of the median of rated
 * houses with the same stars (all rated houses when fewer than
 * STAR_TRAP_MIN_REFERENCE), or below that median with more extras than
 * UNRATED_MAX_EXTRAS_SHARE of the rated houses reach: both point to a fake listing.
 */
export const UNRATED_FINALISTS_MAX = 1;
export const UNRATED_MIN_PRICE_RATIO = 0.8;
export const UNRATED_MAX_EXTRAS_SHARE = 0.25;
/**
 * Review-check candidates may score this much below a threshold: recent
 * reviews can still lift them by up to SCORE_RECENCY_WEIGHT × SCORE_RECENCY_MAX_DELTA.
 */
export const CANDIDATE_QUALITY_MARGIN = SCORE_RECENCY_WEIGHT * SCORE_RECENCY_MAX_DELTA;
/** Star trap: this many stars at a budget price need checked good reviews. */
export const STAR_TRAP_MIN_STARS = 4;
/** Budget price: price per night below this share of the median of houses with at most 3 stars. */
export const STAR_TRAP_PRICE_RATIO = 0.7;
/** The median needs at least this many houses with at most 3 stars in the search. */
export const STAR_TRAP_MIN_REFERENCE = 3;
/** Quality score a star-trap suspect needs, together with a review check without condition or cleanliness warnings. */
export const STAR_TRAP_MIN_QUALITY = 8.0;
/**
 * Complaint topics that take a house out of the finale ("Warnsignale"), with
 * the mentions needed: confirmed by the review check, or keyword hits without
 * AI verification. Two guests on mould or vermin, three on dirt: one guest alone can be wrong.
 */
export const RED_FLAG_MIN_MENTIONS = {
  schimmel: { confirmed: 2, unverified: 3 },
  ungeziefer: { confirmed: 2, unverified: 3 },
  sauberkeit: { confirmed: 3, unverified: 4 },
} as const;
/** Complaint topics that keep a star-trap suspect out (any warning shown on them). */
export const STAR_TRAP_WARNING_TOPICS = ['zustand', 'sauberkeit'] as const;
/** Dominance: a cheaper house counts as at least as good within this quality gap. */
export const DOMINANCE_QUALITY_TOLERANCE = 0.2;
/** Finale: quality differences from this size on are shown. */
export const FINALE_QUALITY_DELTA_MIN = 0.3;
/** Finale price ladder: a row shows this many badges (differences first); the rest opens on request. */
export const FINALE_BADGES_SHOWN = 6;
/** Of these, what a house lacks against the cheapest stays visible up to this many. */
export const FINALE_LOSSES_SHOWN = 2;
/**
 * Praise labels (konzept.md 9.11): at least PRAISE_MIN_MENTIONS praising
 * guests and PRAISE_MIN_REVIEW_SHARE of all reviews of the last
 * PRAISE_MAX_AGE_MONTHS, a praise share of PRAISE_MIN_SHARE of the mentions.
 * Reviews of the last PRAISE_RECENT_MONTHS count PRAISE_RECENT_WEIGHT times,
 * so fresh praise weighs more (3 of 1000 guests say nothing, 3 of 40 do).
 */
export const PRAISE_MIN_MENTIONS = 3;
export const PRAISE_MIN_REVIEW_SHARE = 0.05;
export const PRAISE_MIN_SHARE = 0.8;
export const PRAISE_MAX_AGE_MONTHS = 24;
export const PRAISE_RECENT_MONTHS = 6;
export const PRAISE_RECENT_WEIGHT = 2;
/** The result list shows at most this many labels per house (the most praised first). */
export const PRAISE_MAX_LABELS_LIST = 3;
/** Distance of a house to its place's centre: "im Ortskern" up to, "im Ort" up to (km). */
export const CENTER_DISTANCE_CORE_KM = 0.6;
export const CENTER_DISTANCE_TOWN_KM = 2;
/**
 * Location facts from OpenStreetMap (S11.5, architektur.md 6.15): walking
 * minutes = straight line × WALK_DETOUR_FACTOR at WALK_METERS_PER_MIN.
 * A stop, lift or shop counts up to its walking limit; restaurants and cafés
 * within LOCATION_GASTRO_RADIUS_M, from LOCATION_GASTRO_MIN on.
 */
export const WALK_METERS_PER_MIN = 80;
export const WALK_DETOUR_FACTOR = 1.3;
export const LOCATION_MAX_WALK_MIN = { lift: 15, bahn: 15, bus: 10, supermarkt: 10 } as const;
export const LOCATION_GASTRO_RADIUS_M = 300;
export const LOCATION_GASTRO_MIN = 3;
/** Overpass search radius around a house: covers the longest walking limit. */
export const LOCATION_SEARCH_RADIUS_M = 1200;
export const LOCATION_FACTS_TTL_DAYS = 90;

export const REVIEW_TOP_N = 10;
/**
 * Follow-up rounds (architektur.md 6.15): after the first round the scores
 * move and unchecked houses can move into a finale; at most this many rounds
 * with at most REVIEW_FOLLOWUP_MAX houses each.
 */
export const REVIEW_FOLLOWUP_ROUNDS = 2;
export const REVIEW_FOLLOWUP_MAX = 4;
export const REVIEW_MAX_REVIEWS = 100;
export const REVIEW_MAX_AGE_MONTHS = 24;
export const REVIEW_CACHE_DAYS = 30;
export const REVIEW_SNIPPET_RADIUS = 120;
export const REVIEW_MAX_SNIPPETS_PER_TOPIC = 5;
export const REVIEW_MAX_SNIPPETS_TOTAL = 25;
export const REVIEW_RECENT_MONTHS_LABEL = 6;
/** Unverified results (AI off, budget spent, skill error) are retried sooner. */
export const REVIEW_UNVERIFIED_CACHE_HOURS = 24;
/** Snippets wait at most this long between reviews-fetch and reviews-verify. */
export const REVIEW_PENDING_TTL_HOURS = 24;
/** Provider category ratings (cleanliness) only after validation V7 (architektur.md 6.10). */
export const LITEAPI_USE_SENTIMENT = false;

export const REQUEST_BODY_LIMIT_BYTES = 16 * 1024;
export const SEARCH_TOKEN_BYTES = 32;
export const SEARCH_TOKEN_TTL_DAYS = 30;
export const BOOKING_SESSION_TOKEN_TTL_S = 2 * 60 * 60;
export const BOOKING_ACCESS_TOKEN_TTL_S = 30 * 24 * 60 * 60;
export const BOOKING_REF_LENGTH = 8;
/** E-mail outbox (architektur.md 6.12): attempts and the wait before attempt n+1, in minutes. */
export const EMAIL_MAX_ATTEMPTS = 5;
export const EMAIL_RETRY_BACKOFF_MIN = [2, 10, 30, 120] as const;
/** Batch size of the outbox-retry cron. */
export const EMAIL_RETRY_BATCH = 20;
export const WISH_TEXT_MAX_CHARS = 300;
export const ALTCHA_COST = 5_000;
export const ALTCHA_EXPIRES_S = 10 * 60;
export const STATUS_POLL_INTERVAL_MS = 2_000;
export const HEALTH_DB_TIMEOUT_MS = 3_000;
export const BUDGET_WARN_RATIO = 0.8;

// Skill runner and evals (architektur.md 9.1). Token estimates are deliberately
// pessimistic so the reservation covers the real call.
export const LLM_CHARS_PER_TOKEN_ESTIMATE = 3;
export const LLM_TOOL_OVERHEAD_TOKENS = 350;
export const SKILL_OUTPUT_RETRIES = 1;
export const SKILL_EVAL_REGRESSION_TOLERANCE = 0.02;
export const SKILL_EVAL_BUDGET_USD = 0.5;
export const SKILL_EVAL_TARGET_SCORE = 0.9;
export const LLM_BATCH_POLL_INTERVAL_MS = 30_000;

// Catalog pipeline (S3.4): duplicates closer than this are dropped; matched
// places farther than the spread limit from the region's median lie outside it.
export const CATALOG_DUPLICATE_KM = 3;
export const CATALOG_REGION_MAX_SPREAD_KM = 100;
export const CATALOG_FAKE_POLL_INTERVAL_MS = 10;
