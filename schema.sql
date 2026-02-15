-- LEO Club Event Portal - PostgreSQL schema
-- Run this once to create tables (e.g. psql $DATABASE_URL -f schema.sql)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'coordinator', 'admin')),
  name VARCHAR(255),
  leo_id VARCHAR(50) UNIQUE,
  roll_no VARCHAR(100),
  phone VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date VARCHAR(100),
  time VARCHAR(50),
  venue VARCHAR(255),
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'ongoing', 'closed', 'completed')),
  cost INTEGER DEFAULT 0,
  rules TEXT,
  team_size VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  leo_id VARCHAR(50),
  roll_no VARCHAR(100),
  payment_type VARCHAR(50) DEFAULT 'pay_at_arrival',
  payment_status VARCHAR(100),
  arrived BOOLEAN DEFAULT FALSE,
  screenshot TEXT,
  transaction_id VARCHAR(255),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255),
  screenshot TEXT,
  amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_participations_event ON participations(event_id);
CREATE INDEX IF NOT EXISTS idx_participations_user ON participations(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_participation ON payments(participation_id);
CREATE INDEX IF NOT EXISTS idx_event_coordinators_event ON event_coordinators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_coordinators_user ON event_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_event ON leaderboard(event_id);
CREATE INDEX IF NOT EXISTS idx_winners_event ON winners(event_id);
