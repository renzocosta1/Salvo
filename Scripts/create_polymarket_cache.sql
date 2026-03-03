-- Polymarket odds cache table
CREATE TABLE IF NOT EXISTS polymarket_odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_slug TEXT NOT NULL UNIQUE,
  market_title TEXT NOT NULL,
  market_id TEXT,
  event_id TEXT,
  outcomes JSONB NOT NULL,  -- Array of outcome names
  prices JSONB NOT NULL,     -- Array of prices (0-1, representing probabilities)
  volume_24hr DECIMAL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_polymarket_odds_slug ON polymarket_odds(market_slug);
CREATE INDEX IF NOT EXISTS idx_polymarket_odds_fetched ON polymarket_odds(last_fetched_at DESC);

-- Configured markets to track
CREATE TABLE IF NOT EXISTS polymarket_tracked_markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'governor', 'congress', 'county_exec', etc.
  priority INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tracked markets (Maryland races)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, priority) VALUES
  ('maryland-governor-republican-primary-winner', 'Maryland Governor (R) Primary', 'governor', 1)
ON CONFLICT (slug) DO NOTHING;

-- RLS Policies (public read access)
ALTER TABLE polymarket_odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_tracked_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for polymarket_odds"
  ON polymarket_odds FOR SELECT
  USING (true);

CREATE POLICY "Public read access for polymarket_tracked_markets"
  ON polymarket_tracked_markets FOR SELECT
  USING (active = true);
