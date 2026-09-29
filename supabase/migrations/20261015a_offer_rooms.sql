-- Rooms mapped to the party (Aufgabe 5, docs/logik/zimmer-und-personen.md):
-- an offer knows whether its room fits the party or is clearly larger than
-- needed (display only, outside the price formation), the room's size, and
-- on the cheapest offer every room of the house on that date. Offers stored
-- before keep the defaults and count as fitting, as they always did.
ALTER TABLE app.offers
  ADD COLUMN IF NOT EXISTS room_fit text NOT NULL DEFAULT 'fits' CHECK (room_fit IN ('fits', 'oversized')),
  ADD COLUMN IF NOT EXISTS room_capacity integer CHECK (room_capacity IS NULL OR room_capacity > 0),
  ADD COLUMN IF NOT EXISTS room_options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(room_options) = 'array');
