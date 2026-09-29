-- Searches without a start location (search frame redesign): a traveller who
-- picks the places themselves needs no start location and no drive times, so
-- the origin coordinates of a search may be empty. Existing rows keep theirs.
ALTER TABLE app.searches
  ALTER COLUMN origin_lat DROP NOT NULL,
  ALTER COLUMN origin_lng DROP NOT NULL;
