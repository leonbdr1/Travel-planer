-- 20261003c_skill_runs: telemetry sink of the skill runner (architektur.md
-- 5.7; fields from Frontlift TelemetryEvent plus outcomes `fallback` and
-- `skipped_budget`). Hashes only: neither prompts nor answers are stored.
-- Named 03c because 03b already holds the catalog (plan names swapped).

CREATE TABLE IF NOT EXISTS app.skill_runs (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  skill text NOT NULL,
  version text NOT NULL,
  correlation_id text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text CHECK (output_hash IS NULL OR output_hash ~ '^[0-9a-f]{64}$'),
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  model_used text,
  outcome text NOT NULL CHECK (outcome IN ('ok', 'error', 'fallback', 'skipped_budget')),
  error_message text CHECK (error_message IS NULL OR length(error_message) <= 200),
  batch boolean NOT NULL DEFAULT false,
  downstream_signal text,
  downstream_signal_updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS skill_runs_skill_ts_idx ON app.skill_runs (skill, ts DESC);
CREATE INDEX IF NOT EXISTS skill_runs_ts_idx ON app.skill_runs (ts);

ALTER TABLE app.skill_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.skill_runs FROM PUBLIC, anon, authenticated;
-- The schema's default privileges give app_rw full DML; telemetry is append-only.
REVOKE UPDATE, DELETE, TRUNCATE ON app.skill_runs FROM app_rw;
REVOKE ALL ON SEQUENCE app.skill_runs_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON app.skill_runs TO app_rw, app_import;
GRANT UPDATE (downstream_signal, downstream_signal_updated_at) ON app.skill_runs TO app_rw;
GRANT USAGE ON SEQUENCE app.skill_runs_id_seq TO app_rw, app_import;
DROP POLICY IF EXISTS skill_runs_app_rw ON app.skill_runs;
CREATE POLICY skill_runs_app_rw ON app.skill_runs FOR ALL TO app_rw USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS skill_runs_app_import ON app.skill_runs;
CREATE POLICY skill_runs_app_import ON app.skill_runs FOR ALL TO app_import USING (true) WITH CHECK (true);
