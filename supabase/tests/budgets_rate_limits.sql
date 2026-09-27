-- RPC behaviour: atomic, cap-respecting, fail-closed inputs; app_rw only.
BEGIN;
SELECT plan(16);

SET LOCAL ROLE app_rw;

-- increment_rate_limit
SELECT is((SELECT allowed FROM app.increment_rate_limit('t:ip1', 2, 3600)), true, 'first call allowed');
SELECT is((SELECT allowed FROM app.increment_rate_limit('t:ip1', 2, 3600)), true, 'second call allowed');
SELECT is((SELECT row(count, allowed)::text FROM app.increment_rate_limit('t:ip1', 2, 3600)), '(3,f)', 'third call over the limit');
SELECT is((SELECT allowed FROM app.increment_rate_limit('t:ip2', 2, 3600)), true, 'other key unaffected');
SELECT throws_ok($$SELECT * FROM app.increment_rate_limit('t:ip3', 2, 0)$$, NULL, NULL, 'invalid window raises (caller fails closed)');
RESET ROLE;
UPDATE app.rate_limits SET reset_at = now() - interval '1 second' WHERE key = 't:ip1';
SET LOCAL ROLE app_rw;
SELECT is((SELECT row(count, allowed)::text FROM app.increment_rate_limit('t:ip1', 2, 3600)), '(1,t)', 'expired window starts over');

-- budget_reserve / budget_settle
SELECT is(app.budget_reserve('searches', 1, 2), true, 'reserve within cap');
SELECT is(app.budget_reserve('searches', 1, 2), true, 'reserve up to the cap');
SELECT is(app.budget_reserve('searches', 1, 2), false, 'reserve beyond the cap is refused');
SELECT is(app.budget_reserve('llm_usd', 0.5, 0.4), false, 'single reservation larger than the cap is refused');
SELECT is(app.budget_reserve('llm_usd', -1, 5), false, 'negative amounts are refused');
SELECT is(app.budget_reserve('llm_usd', 0.004, 5), true, 'llm reservation');
SELECT lives_ok($$SELECT app.budget_settle('llm_usd', 0.004, 0.0021)$$, 'settle with actual cost');
SELECT is(
  (SELECT row(reserved, settled)::text FROM app.budget_ledger WHERE scope = 'llm_usd' AND day = (now() AT TIME ZONE 'UTC')::date),
  '(0.000,0.0021)',
  'settle moves the reservation onto the actual cost'
);
SELECT throws_ok($$INSERT INTO app.budget_ledger (day, scope, cap) VALUES (current_date, 'unknown', 1)$$, '23514', NULL,
  'unknown budget scopes are rejected');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT app.budget_reserve('searches', 1, 100)$$, '42501', NULL, 'anon cannot call budget_reserve');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
