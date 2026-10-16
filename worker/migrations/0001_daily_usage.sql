CREATE TABLE IF NOT EXISTS daily_usage (
  subject_hash TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_hash, usage_date)
);

