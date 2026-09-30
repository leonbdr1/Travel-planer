// Domain constants (architektur.md 6.14, start values; calibration in M6/M7).
// Product-level limits (search scope, rate limits, quotas, LLM budget) live in
// product.config.yaml; everything here is a technical or scoring constant.
// Domain functions take these as parameters so tests can vary them.

export const SEARCH_BLOCK_SIZE = 12;
export const SEARCH_JOB_TIMEOUT_S = 180;
export const LITEAPI_MAX_CONCURRENCY = 6;
export const LITEAPI_MAX_CONCURRENCY_SANDBOX = 4;
export const LITEAPI_RATES_TIMEOUT_S = 6;
/** Fresh quotes of a tariff before a booking gives up: rate ids expire and prices move (LiteAPI: "please search again"). */
export const BOOKING_MAX_REQUOTES = 2;
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
/**
 * Drive-time bands (Aufgabe F15/F16, docs/logik/fahrzeit-bloecke.md): the
 * nearer, the more exact. Under DRIVE_EXACT_MAX_MIN the routed minutes, up to
 * DRIVE_HOURS_MAX_MIN the full hours ("ca. 8 h"), beyond that coarse blocks
 * ("über 10 h", "über 20 h"); from DRIVE_FLIGHT_MIN "über 30 h" with a plane
 * (a hint only, no flights are sold).
 */
export const DRIVE_EXACT_MAX_MIN = 420;
export const DRIVE_HOURS_MAX_MIN = 600;
export const DRIVE_BLOCK_MIN = [600, 1200] as const;
export const DRIVE_FLIGHT_MIN = 1800;
/** Places whose long-distance estimate exceeds this are not routed: the coarse estimate is enough for a block. */
export const DRIVE_ROUTE_MAX_MIN = 540;
/** Long-distance estimate (motorways): road factor and average speed incl. breaks. */
export const LONG_DRIVE_ROAD_FACTOR = 1.2;
export const LONG_DRIVE_SPEED_KMH = 95;
/** Largest selectable maximum drive time (30 h); "egal" means no limit. */
export const MAX_DRIVE_MINUTES = 1800;

export const SUGGEST_MIN_REGIONS = 2;
export const SUGGEST_MAX_REGIONS = 5;
/** Close by (no quality gate yet) more regions may be shown than far away (F19). */
export const SUGGEST_MAX_REGIONS_NEAR = 8;
/** Far away or by plane (quality gate on): a short list of hotspots. */
export const SUGGEST_MAX_REGIONS_FAR = 6;
/** Region quality (F19): its best place, plus this much for each further fitting place (at most three). */
export const REGION_QUALITY_SUPPORT_BONUS = 0.3;
export const SUGGEST_MAX_PLACES_PER_REGION = 10;
export const THEME_MIN_STRENGTH = 2;
export const DEFAULT_SEARCH_RADIUS_KM = 10;

export const SCORE_PRIOR_MEAN = 7.5;
/**
 * Additional rating source (external, e.g. Tripadvisor): asked only for houses
 * whose own rating has fewer reviews than this (unrated houses included). The
 * answer is cached per house for EXTERNAL_RATING_TTL_DAYS, also when the source
 * knows nothing about the house. External reviews count EXTERNAL_RATING_WEIGHT
 * each when both sources are fused (other guest population and scale; start
 * value, to be checked against real data).
 */
export const EXTERNAL_RATING_BELOW_REVIEWS = 30;
export const EXTERNAL_RATING_TTL_DAYS = 30;
export const EXTERNAL_RATING_WEIGHT = 0.5;
export const EXTERNAL_RATING_STEP_BUDGET_S = 30;

/**
 * From this many reviews the rating counts as it is (Ben, 2026-09-28: 69
 * reviews with 8.3 are solid); below, it is pulled towards SCORE_PRIOR_MEAN
 * by the missing reviews, so 3 reviews with 10.0 do not beat everything.
 */
export const SCORE_FULL_WEIGHT_REVIEWS = 30;
/**
 * The same by kind (Aufgabe 6, docs/logik/unterkunftsarten.md): a holiday flat
 * with 17 reviews has had many guests for its kind, a hotel with 17 hardly
 * any. The hotel keeps SCORE_FULL_WEIGHT_REVIEWS.
 */
export const SCORE_FULL_WEIGHT_REVIEWS_BY_KIND = { hotel: SCORE_FULL_WEIGHT_REVIEWS, pension: 25, ferienwohnung: 20 } as const;
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
/**
 * Defects bound to one unit (Aufgabe 6): mould in one of many hotel rooms
 * weighs less than in the only flat one books. The warning penalty of these
 * topics is multiplied by the kind's factor; a holiday flat may lose more.
 */
export const UNIT_DEFECT_TOPICS = ['schimmel', 'ungeziefer', 'sauberkeit', 'zustand', 'geruch'] as const;
export const UNIT_DEFECT_PENALTY_FACTOR = { hotel: 0.6, pension: 1, ferienwohnung: 1.6 } as const;
export const SCORE_MAX_PENALTY_BY_KIND = { hotel: SCORE_MAX_PENALTY, pension: SCORE_MAX_PENALTY, ferienwohnung: 3.0 } as const;
export const SEVERITY_WEIGHTS = { low: 0.3, medium: 0.6, high: 1.0 } as const;
export const RECENT_REVIEW_MONTHS = 12;

/**
 * Bargains only by date (Ben, 2026-09-28): the same house clearly cheaper on
 * this date than on the traveller's other dates. The value and place marks
 * were dropped: with real prices nearly every offer carried one.
 */
export const BARGAIN_DATE_FACTOR = 0.8;
export const BARGAIN_DATE_MIN_DATES = 3;
/**
 * Rooms and party (Aufgabe 5, docs/logik/zimmer-und-personen.md): a room fits
 * up to this many places more than the largest group in one room; a bigger one
 * is shown but stays out of the price formation.
 */
export const ROOM_OVERSIZE_EXTRA = 2;
/** Prepared for "Komfort" (not wired): weight of the cheapest fitting room against the median of all fitting rooms. */
export const COMFORT_CHEAPEST_WEIGHT = 0.5;

/**
 * Attractiveness of places (Aufgabe 8, docs/logik/orts-attraktivitaet.md):
 * five criteria 0–3, fame and attractions count double; levels from the score.
 */
export const ATTRACTIVENESS_WEIGHTS = { fame: 2, attractions: 2, trails: 1.5, variety: 1, infrastructure: 1 } as const;
export const ATTRACTIVENESS_LEVELS = { top: 8, beliebt: 6, ruhig: 4 } as const;
/** A place outside the catalog borrows from a catalog place at most this far away. */
export const ATTRACTIVENESS_NEIGHBOUR_KM = 8;

/**
 * Flexible nights (Aufgabe 4, docs/logik/flexible-naechte.md): the extra night
 * of the same stay is "cheap" at most at this share of the nightly price of the
 * shorter stay, "expensive" from this share on.
 */
export const EXTRA_NIGHT_CHEAP_RATIO = 0.7;
export const EXTRA_NIGHT_EXPENSIVE_RATIO = 1.3;
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
/** Relative to the kind (Aufgabe 6): many reviews are normal for a hotel, 60 are many for a holiday flat. */
export const MANY_REVIEWS_MIN_BY_KIND = { hotel: MANY_REVIEWS_MIN, pension: 150, ferienwohnung: 60 } as const;
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
 * Complaint topics that take a house out ("Warnsignale") only when they get
 * out of hand (Ben, 2026-09-29): at least `guests` complaining guests
 * (confirmed by the review check; keyword hits without AI verification need
 * `guestsUnverified`) and at least `share` of the checked reviews, weighted
 * like every mention count (MENTION_RECENT_*). Fewer complaints stay a
 * warning with its score penalty, and the house is ranked like any other.
 */
export const RED_FLAG_THRESHOLDS = {
  schimmel: { guests: 3, guestsUnverified: 4, share: 0.1 },
  ungeziefer: { guests: 3, guestsUnverified: 4, share: 0.1 },
  sauberkeit: { guests: 4, guestsUnverified: 5, share: 0.15 },
} as const;
/** By kind (Aufgabe 6): fewer units, fewer reports needed. The hotel keeps RED_FLAG_THRESHOLDS. */
export const RED_FLAG_THRESHOLDS_BY_KIND = {
  hotel: RED_FLAG_THRESHOLDS,
  pension: {
    schimmel: { guests: 2, guestsUnverified: 3, share: 0.07 },
    ungeziefer: { guests: 2, guestsUnverified: 3, share: 0.07 },
    sauberkeit: { guests: 3, guestsUnverified: 4, share: 0.1 },
  },
  ferienwohnung: {
    schimmel: { guests: 2, guestsUnverified: 3, share: 0.05 },
    ungeziefer: { guests: 2, guestsUnverified: 3, share: 0.05 },
    sauberkeit: { guests: 3, guestsUnverified: 4, share: 0.08 },
  },
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
 * Mentions in reviews, praise and complaints alike (Ben, 2026-09-29: older
 * reviews count less everywhere in the same way): reviews of the last
 * MENTION_RECENT_MONTHS count MENTION_RECENT_WEIGHT times, in the mentions as
 * in the reviews they are measured against.
 */
export const MENTION_RECENT_MONTHS = 6;
export const MENTION_RECENT_WEIGHT = 2;
/**
 * Praise labels (konzept.md 9.11): at least PRAISE_MIN_MENTIONS praising
 * guests and PRAISE_MIN_REVIEW_SHARE of all reviews of the last
 * PRAISE_MAX_AGE_MONTHS (weighted, MENTION_RECENT_*), a praise share of
 * PRAISE_MIN_SHARE of the mentions: fresh praise weighs more, and 3 of 1000
 * guests say nothing while 3 of 40 do.
 */
export const PRAISE_MIN_MENTIONS = 3;
export const PRAISE_MIN_REVIEW_SHARE = 0.05;
export const PRAISE_MIN_SHARE = 0.8;
export const PRAISE_MAX_AGE_MONTHS = 24;
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

/**
 * Suggestion quality grows with the distance (Aufgabe F19, docs/logik/ziel-qualitaet.md):
 * up to QUALITY_NEAR_MAX_MIN of driving every fitting place is welcome; further
 * out a region needs a place of at least the given attractiveness score (the
 * step applies from its `fromMin` on). Beach, culture and shopping trips are
 * judged as if the way were QUALITY_PICKY_FACTOR times as long: nobody drives
 * four hours to a mediocre beach. A flight leads to top destinations only.
 */
export const QUALITY_NEAR_MAX_MIN = 240;
export const QUALITY_STEPS = [
  { fromMin: 240, minScore: 4 },
  { fromMin: 420, minScore: 6 },
  { fromMin: 720, minScore: 8 },
] as const;
export const QUALITY_PICKY_THEMES = ['strand', 'staedte_kultur', 'shopping'] as const;
export const QUALITY_PICKY_FACTOR = 2;
export const QUALITY_FLIGHT_MIN_SCORE = 8;
/** Inside a region with a hotspot, places up to this far below the required score are still shown ("not only Barcelona"). */
export const QUALITY_PLACE_SLACK = 1.5;

/**
 * Flights (F19), shown only, nothing is booked: flight time estimated from the
 * air distance (cruise speed plus a fixed part for climb and descent), without
 * the way to the airport. Destinations closer than FLIGHT_MIN_KM are not a
 * flight trip.
 */
export const FLIGHT_SPEED_KMH = 750;
export const FLIGHT_OVERHEAD_MIN = 45;
export const FLIGHT_MIN_KM = 500;
