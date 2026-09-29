-- External ratings (Testbetrieb 2026-09-29): houses without or with few ratings
-- in LiteAPI get a second source. `external_ratings` holds the answers per
-- source ({"checkedAt": "<iso>", "sources": {"<name>": {"rating": 0–10, "count": n, "url": ...}}});
-- an empty `sources` means "asked, nothing found" and prevents repeated lookups
-- until the entry expires. The LiteAPI columns stay untouched; the fused value
-- is computed when a search is evaluated. The lookups get their own daily
-- budget scope `rating_calls`.
ALTER TABLE app.hotels ADD COLUMN IF NOT EXISTS external_ratings jsonb;

ALTER TABLE app.budget_ledger DROP CONSTRAINT IF EXISTS budget_ledger_scope_check;
ALTER TABLE app.budget_ledger
  ADD CONSTRAINT budget_ledger_scope_check CHECK (scope IN ('llm_usd', 'liteapi_calls', 'ors_calls', 'rating_calls', 'searches'));
