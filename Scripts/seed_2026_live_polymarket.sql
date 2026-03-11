-- =====================================================
-- Seed LIVE 2026 Polymarket Markets
-- =====================================================
-- This adds ACTIVE prediction markets for 2026 Maryland primary
-- These are LIVE markets that update in real-time via Edge Function
--
-- SOURCE: https://polymarket.com/event/maryland-governor-republican-primary-winner
-- Market ID: maryland-governor-republican-primary-winner
-- Last Updated: February 13, 2026
-- =====================================================

-- Clear old 2024 test markets first
DELETE FROM polymarket_odds WHERE market_slug LIKE '%2024%' OR market_slug LIKE '%maryland-presidential%' OR market_slug LIKE '%maryland-senate%';
DELETE FROM polymarket_tracked_markets WHERE slug LIKE '%2024%' OR slug LIKE '%maryland-presidential%' OR slug LIKE '%maryland-senate%';

-- =====================================================
-- MARKET 1: Maryland Governor Republican Primary 2026
-- =====================================================
INSERT INTO polymarket_tracked_markets (
  slug,
  display_name,
  category,
  race_type,
  district_filter,
  county_filter,
  priority,
  active
) VALUES (
  'maryland-governor-republican-primary-winner',
  'Maryland Governor (R) Primary',
  'governor',
  'governor',
  NULL,  -- Statewide race
  NULL,  -- Statewide race
  1,     -- Highest priority
  true   -- ACTIVE market
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  active = true,
  priority = 1,
  race_type = 'governor';

-- Insert current live odds (as of Feb 13, 2026)
-- These will be auto-updated by fetch-polymarket-odds Edge Function
INSERT INTO polymarket_odds (
  market_slug,
  market_title,
  market_id,
  event_id,
  outcomes,
  prices,
  volume_24hr,
  price_24h_ago,
  price_change_24h,
  last_fetched_at,
  created_at,
  updated_at
) VALUES (
  'maryland-governor-republican-primary-winner',
  'Maryland Governor (R) Primary Winner',
  'maryland-governor-republican-primary-winner',
  'maryland-governor-republican-primary-winner',
  '["Dan Cox", "Ed Hale", "Carl Brunner", "Christopher Bouchat", "Steve Hershey", "Kurt Wedekind", "John Myrick", "Larry Hogan"]'::JSONB,
  '[0.30, 0.234, 0.088, 0.08, 0.04, 0.03, 0.03, 0.02]'::JSONB,  -- Current odds as of Feb 13, 2026
  25122,  -- $25,122 trading volume
  '[0.30, 0.234, 0.088, 0.08, 0.04, 0.03, 0.03, 0.02]'::JSONB,  -- Baseline
  '[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]'::JSONB,  -- No change yet
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (market_slug) DO UPDATE SET
  outcomes = EXCLUDED.outcomes,
  prices = EXCLUDED.prices,
  volume_24hr = EXCLUDED.volume_24hr,
  updated_at = NOW();

-- =====================================================
-- FUTURE MARKETS (Uncomment when available)
-- =====================================================

-- US Senate 2028 (not a 2026 race)
-- Maryland's Senate seat is up in 2028, not 2026
-- Wait for Polymarket to create this market

-- US House Districts (when markets become available)
-- INSERT INTO polymarket_tracked_markets (...) VALUES
--   ('maryland-us-house-district-3-2026', 'US Representative MD-3', 'federal', 'us_house', '3', NULL, 2, true);
-- Add more as Polymarket creates district-level markets

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  m.slug,
  m.display_name,
  m.category,
  m.active,
  m.priority,
  o.outcomes,
  o.prices,
  o.volume_24hr,
  o.last_fetched_at
FROM polymarket_tracked_markets m
LEFT JOIN polymarket_odds o ON o.market_slug = m.slug
WHERE m.active = true
ORDER BY m.priority;

-- =====================================================
-- Expected Results
-- =====================================================
-- Should show 1 active market:
-- 1. Maryland Governor (R) Primary
--    - Dan Cox leading at 30%%
--    - Ed Hale second at 23.4%%
--    - 8 total candidates
--    - $25,122 volume
--    - active = true
--
-- These odds will auto-update via the fetch-polymarket-odds
-- Edge Function (schedule it to run every 15 minutes)
-- =====================================================

-- =====================================================
-- Setup Auto-Refresh (Optional)
-- =====================================================
-- To enable live updates, deploy the Edge Function:
-- supabase functions deploy fetch-polymarket-odds
--
-- Then set up a cron job to call it every 15 minutes:
-- https://supabase.com/docs/guides/functions/schedule-functions
--
-- Or call manually from the app when users visit War Room
-- =====================================================

RAISE NOTICE '✅ Live 2026 Maryland Governor market seeded successfully!';
RAISE NOTICE '📊 Current leader: Dan Cox at 30%%';
RAISE NOTICE '🔄 Odds will update automatically via Edge Function';
RAISE NOTICE '🎯 Primary Election: June 24, 2026';
