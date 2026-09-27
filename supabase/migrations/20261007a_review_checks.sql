-- 20261007a_review_checks: review check per hotel (architektur.md 5, 6.10)
-- and the transient keyword snippets between the workflow steps
-- reviews-fetch and reviews-verify.
--
-- review_checks keeps no review texts and no author names: only counts,
-- dates, the recent rating, the topic aggregation and the provider's
-- category ratings. review_check_pending holds the snippets (±120
-- characters, author names already dropped) only until reviews-verify has
-- processed them; the step deletes each row, expired rows are removed by
-- the cleanup job.

CREATE TABLE IF NOT EXISTS app.review_checks (
  hotel_id text PRIMARY KEY REFERENCES app.hotels (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('ok', 'no_reviews', 'skipped_budget', 'failed')),
  reviews_analyzed integer NOT NULL DEFAULT 0 CHECK (reviews_analyzed >= 0),
  latest_review_date date,
  recent_rating numeric(4, 2) CHECK (recent_rating IS NULL OR recent_rating BETWEEN 0 AND 10),
  recent_count integer NOT NULL DEFAULT 0 CHECK (recent_count >= 0),
  topics jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(topics) = 'array'),
  liteapi_sentiment jsonb,
  skill_version text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > checked_at)
);
CREATE INDEX IF NOT EXISTS review_checks_expires ON app.review_checks (expires_at);

CREATE TABLE IF NOT EXISTS app.review_check_pending (
  search_id uuid NOT NULL REFERENCES app.searches (id) ON DELETE CASCADE,
  hotel_id text NOT NULL REFERENCES app.hotels (id) ON DELETE CASCADE,
  scan jsonb NOT NULL,
  snippets jsonb NOT NULL CHECK (jsonb_typeof(snippets) = 'array' AND jsonb_array_length(snippets) BETWEEN 1 AND 25),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (search_id, hotel_id)
);
CREATE INDEX IF NOT EXISTS review_check_pending_expires ON app.review_check_pending (expires_at);

ALTER TABLE app.review_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.review_check_pending ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.review_checks, app.review_check_pending FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.review_checks, app.review_check_pending TO app_rw;

DROP POLICY IF EXISTS review_checks_app_rw ON app.review_checks;
CREATE POLICY review_checks_app_rw ON app.review_checks FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS review_check_pending_app_rw ON app.review_check_pending;
CREATE POLICY review_check_pending_app_rw ON app.review_check_pending FOR ALL TO app_rw USING (true) WITH CHECK (true);
