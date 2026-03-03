-- ============================================================================
-- ADD INITIAL TRACKED MARKETS
-- ============================================================================
-- Run this in Supabase SQL Editor to add the initial markets we want to track
-- ============================================================================

-- Add Maryland Governor Republican Primary
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'maryland-governor-republican-primary-winner',
  'Maryland Governor (R) Primary',
  'governor',
  'governor',
  NULL,
  NULL,
  1,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  race_type = EXCLUDED.race_type,
  active = true;

-- Add MD-6 Congressional Race (General Election - Party Control)
-- This market is "Which party will win MD-6?" (Democrats vs Republicans)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'which-party-wins-marylands-6th-congressional-district',
  'US Representative - District 6',
  'federal',
  'us_house',
  '6',
  NULL,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- Verify the markets are added
SELECT * FROM polymarket_tracked_markets WHERE active = true ORDER BY priority;
