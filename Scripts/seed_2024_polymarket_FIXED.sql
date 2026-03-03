-- =====================================================
-- Seed 2024 Closed Polymarket Markets for Testing
-- =====================================================
-- This seeds FINAL RESULTS from closed 2024 Maryland races
-- to demonstrate what War Room looks like after election day
--
-- SOURCE: https://polymarket.com/event/maryland-presidential-election-winner
-- All markets are RESOLVED with final probabilities

-- =====================================================
-- MARKET 1: Maryland Presidential Election (CLOSED)
-- =====================================================
INSERT INTO polymarket_tracked_markets (
  slug,
  display_name,
  category,
  race_type,
  priority,
  active
) VALUES (
  'maryland-presidential-election-winner',
  'Maryland Presidential Election Winner',
  'federal',
  'president',
  1,
  false -- CLOSED market
)
ON CONFLICT (slug) DO UPDATE SET
  active = false,
  race_type = 'president';

-- Insert final odds for Presidential race
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
  'maryland-presidential-election-winner',
  'Maryland Presidential Election Winner',
  NULL,
  'maryland-presidential-election-winner',
  '["Kamala Harris", "Donald Trump", "Other"]'::JSONB,
  '[0.988, 0.001, 0.011]'::JSONB, -- Harris 98.8%, Trump <1%, Other 1.1%
  1039135, -- $1.04M volume
  '[0.988, 0.001, 0.011]'::JSONB, -- No change after resolution
  '[0.0, 0.0, 0.0]'::JSONB,
  '2024-11-05T23:59:59Z',
  '2024-03-28T16:39:00Z',
  '2024-11-05T23:59:59Z'
)
ON CONFLICT (market_slug) DO UPDATE SET
  outcomes = EXCLUDED.outcomes,
  prices = EXCLUDED.prices,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- MARKET 2: Maryland US Senate Election (CLOSED)
-- =====================================================
INSERT INTO polymarket_tracked_markets (
  slug,
  display_name,
  category,
  race_type,
  priority,
  active
) VALUES (
  'maryland-senate-election-2024',
  'Maryland US Senate Election Winner',
  'federal',
  'us_senate',
  2,
  false -- CLOSED market
)
ON CONFLICT (slug) DO UPDATE SET
  active = false,
  race_type = 'us_senate';

-- Insert final odds for Senate race
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
  'maryland-senate-election-2024',
  'Maryland US Senate Election Winner',
  NULL,
  'maryland-senate-election-2024',
  '["Angela Alsobrooks (D)", "Larry Hogan (R)"]'::JSONB,
  '[1.0, 0.0]'::JSONB, -- Alsobrooks won 100%
  500000, -- Estimated volume
  '[1.0, 0.0]'::JSONB,
  '[0.0, 0.0]'::JSONB,
  '2024-11-05T23:59:59Z',
  '2024-03-28T16:39:00Z',
  '2024-11-05T23:59:59Z'
)
ON CONFLICT (market_slug) DO UPDATE SET
  outcomes = EXCLUDED.outcomes,
  prices = EXCLUDED.prices,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  m.slug,
  m.display_name,
  m.category,
  m.active,
  o.outcomes,
  o.prices
FROM polymarket_tracked_markets m
LEFT JOIN polymarket_odds o ON o.market_slug = m.slug
WHERE m.slug LIKE 'maryland%'
ORDER BY m.priority;

-- =====================================================
-- Notes
-- =====================================================
-- These are CLOSED markets showing final results
-- active = false means betting is over
-- Prices show final resolved probabilities (winners at 100%% or near 100%%)
--
-- This demonstrates what War Room looks like AFTER election day
-- when all races are resolved and winners are known
--
-- For 2026, we'll track ACTIVE markets with real-time odds updates
