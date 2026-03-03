-- =====================================================
-- Seed 2024 Closed Polymarket Markets for Testing
-- =====================================================
-- This seeds FINAL RESULTS from closed 2024 Maryland races
-- to demonstrate what War Room looks like after election day
--
-- SOURCE: https://polymarket.com/event/maryland-presidential-election-winner
-- All markets are RESOLVED with final probabilities

DO $$
DECLARE
  v_md_pres_market_id UUID;
  v_md_senate_market_id UUID;
BEGIN

  -- =====================================================
  -- MARKET 1: Maryland Presidential Election (CLOSED)
  -- =====================================================
  INSERT INTO polymarket_tracked_markets (
    polymarket_id,
    question,
    race_type,
    office,
    state,
    district,
    county,
    is_active,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    'maryland-presidential-election-winner',
    'Maryland Presidential Election Winner',
    'federal',
    'President',
    'Maryland',
    NULL,
    NULL,
    false, -- CLOSED
    '2024-11-05T23:59:59Z',
    '2024-03-28T16:39:00Z',
    now()
  )
  RETURNING id INTO v_md_pres_market_id;

  -- Final odds (RESOLVED - Harris won)
  INSERT INTO polymarket_odds (
    market_id,
    outcomes,
    prices,
    last_updated,
    price_change_24h
  ) VALUES (
    v_md_pres_market_id,
    ARRAY['Kamala Harris', 'Donald Trump', 'Other'],
    ARRAY[0.988, 0.001, 0.011], -- Harris 98.8%, Trump <1%, Other 1.1%
    '2024-11-05T23:59:59Z',
    ARRAY[0.0, 0.0, 0.0] -- No changes after resolution
  );

  -- =====================================================
  -- MARKET 2: Maryland US Senate Election (CLOSED)
  -- =====================================================
  INSERT INTO polymarket_tracked_markets (
    polymarket_id,
    question,
    race_type,
    office,
    state,
    district,
    county,
    is_active,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    'maryland-senate-election-2024',
    'Maryland US Senate Election Winner',
    'federal',
    'US Senator',
    'Maryland',
    NULL,
    NULL,
    false, -- CLOSED
    '2024-11-05T23:59:59Z',
    '2024-03-28T16:39:00Z',
    now()
  )
  RETURNING id INTO v_md_senate_market_id;

  -- Final odds (RESOLVED - Alsobrooks won)
  INSERT INTO polymarket_odds (
    market_id,
    outcomes,
    prices,
    last_updated,
    price_change_24h
  ) VALUES (
    v_md_senate_market_id,
    ARRAY['Angela Alsobrooks (D)', 'Larry Hogan (R)'],
    ARRAY[1.0, 0.0], -- Alsobrooks won 100%, Hogan lost
    '2024-11-05T23:59:59Z',
    ARRAY[0.0, 0.0]
  );

  RAISE NOTICE 'Successfully seeded 2024 closed Polymarket markets for Maryland';
  RAISE NOTICE 'Markets created: Presidential (Harris 98.8%%), Senate (Alsobrooks 100%%)';
END $$;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  m.question,
  m.office,
  m.is_active,
  m.end_date,
  o.outcomes,
  o.prices
FROM polymarket_tracked_markets m
LEFT JOIN polymarket_odds o ON o.market_id = m.id
WHERE m.polymarket_id LIKE '%maryland%'
ORDER BY m.created_at;

-- =====================================================
-- Notes
-- =====================================================
-- These are CLOSED markets showing final results
-- is_active = false means betting is over
-- Prices show final resolved probabilities (winners at 100% or near 100%)
--
-- This demonstrates what War Room looks like AFTER election day
-- when all races are resolved and winners are known
--
-- For 2026, we'll track ACTIVE markets with real-time odds updates
