-- Review age (Ben, 2026-09-28): reviews older than 36 months count a third
-- towards the full weight of a rating. A review check stores how many reviews
-- it loaded and how many of them were not older; checks stored before keep
-- NULL and count their reviews in full until they expire.
ALTER TABLE app.review_checks
  ADD COLUMN IF NOT EXISTS reviews_loaded integer CHECK (reviews_loaded IS NULL OR reviews_loaded >= 0),
  ADD COLUMN IF NOT EXISTS fresh_count integer CHECK (fresh_count IS NULL OR fresh_count >= 0);
