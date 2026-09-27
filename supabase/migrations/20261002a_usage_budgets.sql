-- 20261002a_usage_budgets: provider usage counters, daily budget ledger with
-- fail-closed reserve/settle RPCs (Frontlift demoBudget pattern) and the
-- atomic rate-limit RPC (Frontlift rate-limit.ts; moved here from S4.2
-- because the ORS minute quota in S2.3 already needs it).
-- look_to_book_ratio follows in 20261008a_bookings (it reads app.bookings).

CREATE TABLE IF NOT EXISTS app.provider_usage (
  day date NOT NULL,
  provider text NOT NULL,
  endpoint text NOT NULL,
  calls integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (day, provider, endpoint)
);

CREATE TABLE IF NOT EXISTS app.budget_ledger (
  day date NOT NULL,
  scope text NOT NULL CHECK (scope IN ('llm_usd', 'liteapi_calls', 'ors_calls', 'searches')),
  reserved numeric NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  settled numeric NOT NULL DEFAULT 0 CHECK (settled >= 0),
  cap numeric NOT NULL CHECK (cap >= 0),
  PRIMARY KEY (day, scope)
);

CREATE TABLE IF NOT EXISTS app.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

ALTER TABLE app.provider_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.budget_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.provider_usage, app.budget_ledger, app.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.provider_usage, app.budget_ledger, app.rate_limits TO app_rw;
DROP POLICY IF EXISTS provider_usage_app_rw ON app.provider_usage;
CREATE POLICY provider_usage_app_rw ON app.provider_usage FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS budget_ledger_app_rw ON app.budget_ledger;
CREATE POLICY budget_ledger_app_rw ON app.budget_ledger FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rate_limits_app_rw ON app.rate_limits;
CREATE POLICY rate_limits_app_rw ON app.rate_limits FOR ALL TO app_rw USING (true) WITH CHECK (true);

-- Atomic counter per key and window. Returns the new count and whether the
-- call is allowed. Callers treat any error as "not allowed" (fail-closed).
CREATE OR REPLACE FUNCTION app.increment_rate_limit(p_key text, p_max integer, p_window bigint)
RETURNS TABLE (count integer, allowed boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = app, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_key IS NULL OR p_max IS NULL OR p_window IS NULL OR p_max < 0 OR p_window <= 0 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;
  INSERT INTO app.rate_limits AS r (key, count, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at <= now() THEN now() + make_interval(secs => p_window) ELSE r.reset_at END
  RETURNING r.count INTO v_count;
  RETURN QUERY SELECT v_count, v_count <= p_max;
END
$$;

-- Reserve `p_amount` of today's budget `p_scope` (UTC day) if the cap allows
-- it. One statement; concurrent callers serialise on the row.
CREATE OR REPLACE FUNCTION app.budget_reserve(p_scope text, p_amount numeric, p_cap numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = app, pg_temp
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_amount IS NULL OR p_cap IS NULL OR p_amount < 0 OR p_amount > p_cap THEN
    RETURN false;
  END IF;
  INSERT INTO app.budget_ledger AS b (day, scope, reserved, settled, cap)
  VALUES ((now() AT TIME ZONE 'UTC')::date, p_scope, p_amount, 0, p_cap)
  ON CONFLICT (day, scope) DO UPDATE
    SET reserved = b.reserved + EXCLUDED.reserved,
        cap = EXCLUDED.cap
    WHERE b.reserved + b.settled + EXCLUDED.reserved <= EXCLUDED.cap
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END
$$;

-- Book a reservation onto the actual cost.
CREATE OR REPLACE FUNCTION app.budget_settle(p_scope text, p_reserved numeric, p_actual numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = app, pg_temp
AS $$
BEGIN
  UPDATE app.budget_ledger
     SET reserved = greatest(reserved - coalesce(p_reserved, 0), 0),
         settled = settled + greatest(coalesce(p_actual, 0), 0)
   WHERE day = (now() AT TIME ZONE 'UTC')::date
     AND scope = p_scope;
END
$$;

REVOKE ALL ON FUNCTION app.increment_rate_limit(text, integer, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.budget_reserve(text, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.budget_settle(text, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.increment_rate_limit(text, integer, bigint) TO app_rw;
GRANT EXECUTE ON FUNCTION app.budget_reserve(text, numeric, numeric) TO app_rw;
GRANT EXECUTE ON FUNCTION app.budget_settle(text, numeric, numeric) TO app_rw;
