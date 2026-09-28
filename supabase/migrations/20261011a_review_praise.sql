-- 20261011a_review_praise: praise and criticism counts per topic on the
-- review check, for the praise labels (konzept.md 9.11, architektur.md 6.15).
--
-- Counts only, as in `topics`: [{"topic": "fruehstueck", "praised": 23,
-- "criticized": 2}, …]. No review texts, no author names. Checks written
-- before this migration keep an empty list until they expire.

ALTER TABLE app.review_checks ADD COLUMN IF NOT EXISTS praise jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app.review_checks DROP CONSTRAINT IF EXISTS review_checks_praise_array;
ALTER TABLE app.review_checks ADD CONSTRAINT review_checks_praise_array CHECK (jsonb_typeof(praise) = 'array');
