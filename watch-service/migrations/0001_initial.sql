CREATE TABLE watch_targets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('mynavi','official','other')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_success_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','checking','error','paused')),
  last_http_status INTEGER,
  last_hash TEXT,
  last_error TEXT,
  snapshot TEXT,
  lease_until TEXT,
  UNIQUE(company_id, normalized_url)
);
CREATE INDEX idx_watch_targets_due ON watch_targets(enabled, last_checked_at);

CREATE TABLE watch_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  watch_target_id TEXT NOT NULL REFERENCES watch_targets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_excerpt TEXT,
  after_excerpt TEXT,
  detected_at TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,
  UNIQUE(watch_target_id, content_hash, event_type)
);
CREATE INDEX idx_watch_events_unread ON watch_events(read, detected_at DESC);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
