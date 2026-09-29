-- Attractiveness of places (Aufgabe 8, docs/logik/orts-attraktivitaet.md):
-- the two hand-rated criteria of a catalog place, fame and attractions (lifts,
-- ski area, major sights), each 0–3. User places and places imported before
-- keep NULL; the score is computed at read time from these, the themes and the
-- population.
ALTER TABLE app.places
  ADD COLUMN IF NOT EXISTS fame smallint CHECK (fame IS NULL OR fame BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS attractions smallint CHECK (attractions IS NULL OR attractions BETWEEN 0 AND 3);
