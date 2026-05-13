CREATE TABLE IF NOT EXISTS log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  module TEXT NOT NULL,
  payload TEXT NOT NULL,
  correlation_id TEXT,
  request_id TEXT,
  external_event_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_log_created_at
ON log (created_at);
