PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS balances (
  employee_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  available_days REAL NOT NULL CHECK (available_days >= 0),
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  PRIMARY KEY (employee_id, location_id)
);

CREATE TABLE IF NOT EXISTS time_off_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  days REAL NOT NULL CHECK (days > 0),
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','SYNCED','REJECTED','CANCELLED','FAILED_SYNC','REVERSED')),
  sync_state TEXT,
  drift_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS balance_ledger (
  id TEXT PRIMARY KEY,
  balance_key TEXT NOT NULL,
  type TEXT NOT NULL,
  days REAL NOT NULL,
  request_id TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(request_id) REFERENCES time_off_requests(id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  request_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(request_id) REFERENCES time_off_requests(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_events_dedupe
ON sync_events (external_event_id, payload_hash, direction);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  response_body TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  job_id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  chunk_size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  checkpoint_index INTEGER NOT NULL,
  processed_rows INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES batch_jobs(job_id)
);

CREATE TABLE IF NOT EXISTS dead_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  row_payload TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES batch_jobs(job_id)
);

CREATE TABLE IF NOT EXISTS drift_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  local_days REAL,
  hcm_days REAL NOT NULL,
  delta REAL NOT NULL,
  created_at TEXT NOT NULL
);
