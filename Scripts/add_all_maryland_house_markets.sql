-- ============================================================================
-- ADD ALL MARYLAND CONGRESSIONAL DISTRICT MARKETS
-- ============================================================================
-- Adds general election Polymarket markets for all 8 Maryland House districts
-- These show Republican vs Democrat odds for November 2026 general election
-- ============================================================================

-- MD-1: Republican-leaning district
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-01-house-election-winner',
  'US Representative - District 1 (General)',
  'federal',
  'us_house',
  '1',
  NULL,
  10,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-2: Competitive district (Baltimore County)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-02-house-election-winner',
  'US Representative - District 2 (General)',
  'federal',
  'us_house',
  '2',
  NULL,
  11,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-3: Anne Arundel/Howard County
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-03-house-election-winner',
  'US Representative - District 3 (General)',
  'federal',
  'us_house',
  '3',
  NULL,
  12,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-4: Prince George's County (Heavily Democratic)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-04-house-election-winner',
  'US Representative - District 4 (General)',
  'federal',
  'us_house',
  '4',
  NULL,
  13,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-5: Southern Maryland/Prince George's
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-05-house-election-winner',
  'US Representative - District 5 (General)',
  'federal',
  'us_house',
  '5',
  NULL,
  14,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-6: Montgomery/Frederick (Your district!)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-06-house-election-winner',
  'US Representative - District 6 (General)',
  'federal',
  'us_house',
  '6',
  NULL,
  15,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-7: Baltimore City (Heavily Democratic)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-07-house-election-winner',
  'US Representative - District 7 (General)',
  'federal',
  'us_house',
  '7',
  NULL,
  16,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- MD-8: Montgomery County (Heavily Democratic)
INSERT INTO polymarket_tracked_markets (slug, display_name, category, race_type, district_filter, county_filter, priority, active) 
VALUES (
  'md-08-house-election-winner',
  'US Representative - District 8 (General)',
  'federal',
  'us_house',
  '8',
  NULL,
  17,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  race_type = EXCLUDED.race_type,
  district_filter = EXCLUDED.district_filter,
  active = true;

-- Verify all districts are added
SELECT slug, display_name, race_type, district_filter, active, priority
FROM polymarket_tracked_markets 
WHERE race_type = 'us_house'
ORDER BY district_filter::INTEGER;
