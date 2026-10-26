CREATE TABLE IF NOT EXISTS log_events (
  event_id UUID,
  timestamp DateTime MATERIALIZED now(),
  deployment_id Nullable(String),
  log String,
  metadata Nullable(String),
  -- Producer-side sequence number. BullMQ processes jobs concurrently, so
  -- ClickHouse insertion order is not guaranteed to match build output order.
  seq UInt32 DEFAULT 0
)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp);

-- Safe to run against an existing table created before `seq` was added.
ALTER TABLE log_events ADD COLUMN IF NOT EXISTS seq UInt32 DEFAULT 0;