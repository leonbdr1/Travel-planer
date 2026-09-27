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
export const TRAVEL_TIME_CACHE_TTL_DAYS = 180;

export const LOOK_TO_BOOK_ALERT = 3000;
export const LOOK_TO_BOOK_THROTTLE = 4500;
export const LOOK_TO_BOOK_WINDOW_DAYS = 7;
export const THROTTLED_MAX_COMBINATIONS = 60;

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
export const SCORE_PRIOR_WEIGHT = 50;
export const SCORE_RECENCY_WEIGHT = 0.5;
export const SCORE_RECENCY_MIN_COUNT = 5;
export const SCORE_RECENCY_DAMPING = 10;
export const SCORE_RECENCY_MAX_DELTA = 1.5;
export const SCORE_CLEANLINESS_WEIGHT = 0.2;
export const SCORE_CLEANLINESS_WEIGHT_CHIP = 0.35;
export const SCORE_MAX_PENALTY = 2.0;
export const SEVERITY_WEIGHTS = { low: 0.3, medium: 0.6, high: 1.0 } as const;
export const RECENT_REVIEW_MONTHS = 12;

export const BARGAIN_VALUE_FACTOR = 1.3;
export const BARGAIN_VALUE_MIN_OFFERS = 10;
export const BARGAIN_VALUE_MIN_QUALITY = 7.0;
export const BARGAIN_DATE_FACTOR = 0.8;
export const BARGAIN_DATE_MIN_DATES = 3;
export const BARGAIN_PLACE_FACTOR = 0.75;
export const BARGAIN_PLACE_MIN_OFFERS = 5;
export const BARGAIN_PLACE_MAX_QUALITY_GAP = 1.0;
/** Calibration target (umsetzungsplan S6.4): bargain share per type of F. */
export const CALIBRATION_BARGAIN_RATE_MIN = 0.05;
export const CALIBRATION_BARGAIN_RATE_MAX = 0.2;

export const RANK_W_QUALITY = 0.6;
export const RANK_W_PRICE = 0.4;
export const RANK_BARGAIN_BONUS = 0.05;
export const RANK_UNRATED_QUALITY_NORM = 0.5;

export const REVIEW_TOP_N = 10;
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
export const EMAIL_MAX_ATTEMPTS = 5;
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
