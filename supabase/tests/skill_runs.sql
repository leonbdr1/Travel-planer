-- Skill telemetry: app_rw appends and reads rows, may only update the
-- downstream signal, cannot delete; hashes and outcomes are constrained.
BEGIN;
SELECT plan(7);

SET LOCAL ROLE app_rw;
SELECT lives_ok($$
  INSERT INTO app.skill_runs (skill, version, correlation_id, input_hash, latency_ms, cost_usd, model_used, outcome)
  VALUES ('reiseplaner.wish-parse', '1.0.0', 'req-1', repeat('a', 64), 120, 0.0012, 'claude-haiku-4-5-20251001', 'ok')
$$, 'app_rw records a skill run');
SELECT is((SELECT count(*)::int FROM app.skill_runs WHERE correlation_id = 'req-1'), 1, 'app_rw reads skill runs');
SELECT lives_ok($$UPDATE app.skill_runs SET downstream_signal = 'chip_kept', downstream_signal_updated_at = now() WHERE correlation_id = 'req-1'$$,
  'app_rw sets the downstream signal');
SELECT throws_ok($$UPDATE app.skill_runs SET cost_usd = 0 WHERE correlation_id = 'req-1'$$, '42501', NULL,
  'app_rw cannot rewrite costs');
SELECT throws_ok($$DELETE FROM app.skill_runs$$, '42501', NULL, 'app_rw cannot delete telemetry');
SELECT throws_ok($$
  INSERT INTO app.skill_runs (skill, version, correlation_id, input_hash, latency_ms, outcome)
  VALUES ('x', '1', 'c', 'not-a-hash', 1, 'ok')
$$, '23514', NULL, 'input_hash must be a SHA-256 hex digest');
SELECT throws_ok($$
  INSERT INTO app.skill_runs (skill, version, correlation_id, input_hash, latency_ms, outcome)
  VALUES ('x', '1', 'c', repeat('b', 64), 1, 'maybe')
$$, '23514', NULL, 'outcome is constrained');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
