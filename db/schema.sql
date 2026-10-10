-- AI-Powered Data Fetch & Export Tool Schema

CREATE TABLE IF NOT EXISTS datasets (
  id          SERIAL PRIMARY KEY,
  query       TEXT        NOT NULL,
  note        TEXT,
  columns     JSONB       NOT NULL,
  rows        JSONB       NOT NULL,
  row_count   INTEGER     NOT NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets (created_at DESC);

CREATE TABLE IF NOT EXISTS generation_cache (
  cache_key   TEXT PRIMARY KEY,
  response    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counter (
  day    DATE PRIMARY KEY,
  calls  INTEGER NOT NULL DEFAULT 0
);
