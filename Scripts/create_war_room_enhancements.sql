-- ============================================================================
-- WAR ROOM ENHANCEMENTS: Personalized Odds + Alert System
-- ============================================================================
-- Run this AFTER create_polymarket_cache.sql
-- Adds personalization and alert capabilities to Polymarket integration
-- ============================================================================

-- Add personalization columns to tracked markets
ALTER TABLE polymarket_tracked_markets
ADD COLUMN IF NOT EXISTS race_type TEXT,
ADD COLUMN IF NOT EXISTS district_filter TEXT,
ADD COLUMN IF NOT EXISTS county_filter TEXT;

-- Update existing market with race type
UPDATE polymarket_tracked_markets 
SET race_type = 'governor', 
    district_filter = NULL, 
    county_filter = NULL 
WHERE slug = 'maryland-governor-republican-primary-winner';

-- Add price tracking columns to odds table
ALTER TABLE polymarket_odds
ADD COLUMN IF NOT EXISTS price_24h_ago JSONB,
ADD COLUMN IF NOT EXISTS price_change_24h JSONB,
ADD COLUMN IF NOT EXISTS alert_triggered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMPTZ;

-- Create alerts table for RED ALERT system
CREATE TABLE IF NOT EXISTS polymarket_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_slug TEXT NOT NULL REFERENCES polymarket_odds(market_slug) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'major_shift', 'lost_lead', 'gained_lead'
  outcome_name TEXT NOT NULL, -- Which candidate/outcome triggered alert
  old_price DECIMAL NOT NULL,
  new_price DECIMAL NOT NULL,
  price_change DECIMAL NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick alert lookups
CREATE INDEX IF NOT EXISTS idx_polymarket_alerts_market ON polymarket_alerts(market_slug, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_polymarket_alerts_active ON polymarket_alerts(triggered_at DESC) 
  WHERE cardinality(acknowledged_by_user_ids) = 0;

-- RLS for alerts (public read)
ALTER TABLE polymarket_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for polymarket_alerts"
  ON polymarket_alerts FOR SELECT
  USING (true);

-- Function to check and create alerts based on price changes
CREATE OR REPLACE FUNCTION check_odds_for_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_market RECORD;
  v_outcome_idx INTEGER;
  v_old_price DECIMAL;
  v_new_price DECIMAL;
  v_price_change DECIMAL;
  v_outcome_name TEXT;
BEGIN
  -- Loop through all markets with price history
  FOR v_market IN 
    SELECT * FROM polymarket_odds 
    WHERE price_24h_ago IS NOT NULL
  LOOP
    -- Check each outcome for significant changes
    FOR v_outcome_idx IN 0..jsonb_array_length(v_market.prices) - 1
    LOOP
      v_outcome_name := (v_market.outcomes->>v_outcome_idx)::TEXT;
      v_new_price := (v_market.prices->>v_outcome_idx)::DECIMAL;
      v_old_price := (v_market.price_24h_ago->>v_outcome_idx)::DECIMAL;
      v_price_change := v_new_price - v_old_price;
      
      -- Check for major shift (>5% change)
      IF ABS(v_price_change) > 0.05 THEN
        -- Check if we already alerted recently (within 1 hour)
        IF NOT EXISTS (
          SELECT 1 FROM polymarket_alerts 
          WHERE market_slug = v_market.market_slug 
            AND outcome_name = v_outcome_name
            AND triggered_at > NOW() - INTERVAL '1 hour'
        ) THEN
          INSERT INTO polymarket_alerts (
            market_slug, 
            alert_type, 
            outcome_name,
            old_price, 
            new_price, 
            price_change
          ) VALUES (
            v_market.market_slug,
            'major_shift',
            v_outcome_name,
            v_old_price,
            v_new_price,
            v_price_change
          );
          
          RAISE NOTICE 'ALERT: % shifted from % to % (% change)', 
            v_outcome_name, v_old_price, v_new_price, v_price_change;
        END IF;
      END IF;
      
      -- Check for lost lead (was >50%, now <50%)
      IF v_old_price > 0.5 AND v_new_price < 0.5 THEN
        IF NOT EXISTS (
          SELECT 1 FROM polymarket_alerts 
          WHERE market_slug = v_market.market_slug 
            AND outcome_name = v_outcome_name
            AND alert_type = 'lost_lead'
            AND triggered_at > NOW() - INTERVAL '4 hours'
        ) THEN
          INSERT INTO polymarket_alerts (
            market_slug, 
            alert_type, 
            outcome_name,
            old_price, 
            new_price, 
            price_change
          ) VALUES (
            v_market.market_slug,
            'lost_lead',
            v_outcome_name,
            v_old_price,
            v_new_price,
            v_price_change
          );
          
          RAISE NOTICE 'RED ALERT: % lost lead! Dropped from % to %', 
            v_outcome_name, v_old_price, v_new_price;
        END IF;
      END IF;
      
      -- Check for gained lead (was <50%, now >50%)
      IF v_old_price < 0.5 AND v_new_price > 0.5 THEN
        IF NOT EXISTS (
          SELECT 1 FROM polymarket_alerts 
          WHERE market_slug = v_market.market_slug 
            AND outcome_name = v_outcome_name
            AND alert_type = 'gained_lead'
            AND triggered_at > NOW() - INTERVAL '4 hours'
        ) THEN
          INSERT INTO polymarket_alerts (
            market_slug, 
            alert_type, 
            outcome_name,
            old_price, 
            new_price, 
            price_change
          ) VALUES (
            v_market.market_slug,
            'gained_lead',
            v_outcome_name,
            v_old_price,
            v_new_price,
            v_price_change
          );
          
          RAISE NOTICE 'GREEN ALERT: % gained lead! Rose from % to %', 
            v_outcome_name, v_old_price, v_new_price;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Add more Maryland race markets (to be populated as markets become available)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority) VALUES
  ('maryland-governor-republican-primary-winner', 'Maryland Governor (R) Primary', 'governor', 'governor', NULL, NULL, 1)
ON CONFLICT (slug) DO UPDATE SET
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  county_filter = EXCLUDED.county_filter;

-- Placeholder entries for when markets become available
-- Uncomment and update when actual Polymarket markets exist:

-- US Senate (if market created)
-- INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority) VALUES
--   ('maryland-us-senate-2026', 'US Senator - Maryland', 'federal', 'us_senate', NULL, NULL, 2)
-- ON CONFLICT (slug) DO NOTHING;

-- US House MD-6 (if market created)
-- INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority) VALUES
--   ('maryland-us-house-district-6-2026', 'US Representative - District 6', 'federal', 'us_house', '6', NULL, 3)
-- ON CONFLICT (slug) DO NOTHING;

-- Montgomery County Executive (if market created)
-- INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority) VALUES
--   ('montgomery-county-executive-2026', 'County Executive - Montgomery', 'county', 'county_exec', NULL, 'Montgomery', 4)
-- ON CONFLICT (slug) DO NOTHING;

-- Comments for manual addition of markets
COMMENT ON TABLE polymarket_tracked_markets IS 
'Tracked Polymarket markets. Add new markets manually as they become available on Polymarket. Use race_type and filters for personalized display based on user district/county.';

COMMENT ON COLUMN polymarket_tracked_markets.race_type IS 
'Race type: governor, us_senate, us_house, state_senator, house_delegate, county_exec, county_council, board_education, ballot_question';

COMMENT ON COLUMN polymarket_tracked_markets.district_filter IS 
'For district-specific races (US House, State Senator, etc.). NULL for statewide races. Example: "6" for MD-6, "15" for State District 15';

COMMENT ON COLUMN polymarket_tracked_markets.county_filter IS 
'For county-specific races (County Executive, County Council, etc.). NULL for statewide/federal races. Example: "Montgomery", "Anne Arundel"';
