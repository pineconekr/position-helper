-- Members table
CREATE TABLE IF NOT EXISTS members (
  name TEXT PRIMARY KEY,
  active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Weeks table (assignments and absences)
CREATE TABLE IF NOT EXISTS weeks (
  week_date DATE PRIMARY KEY,
  data JSONB NOT NULL
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT,
  title TEXT,
  description TEXT,
  meta JSONB
);
