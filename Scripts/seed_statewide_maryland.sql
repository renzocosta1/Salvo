-- ============================================================================
-- STATEWIDE MARYLAND BALLOT DATA - PHASED ROLLOUT
-- ============================================================================
-- This script provides a framework for seeding ballot data for all Maryland
-- counties. Currently, Montgomery County (Districts 14-20) is fully seeded.
-- 
-- USAGE:
-- 1. Montgomery County is COMPLETE (see seed_montgomery_alpha_data.sql)
-- 2. For other counties, follow the templates below
-- 3. Replace placeholder data with actual candidates from MD Board of Elections
-- ============================================================================

-- ============================================================================
-- PHASE 1: MONTGOMERY COUNTY (COMPLETE)
-- ============================================================================
-- Already seeded in seed_montgomery_alpha_data.sql
-- Districts: 14, 15, 16, 17, 18, 19, 20
-- Total: ~7 districts x ~8 races = ~56 races

-- ============================================================================
-- PHASE 2: MAJOR COUNTIES (Priority Implementation)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ANNE ARUNDEL COUNTY
-- Legislative Districts: 12, 21, 30, 31, 32, 33
-- Congressional District: MD-3, MD-5
-- ----------------------------------------------------------------------------
-- TEMPLATE:
-- INSERT INTO md_ballot_races (race_title, race_type, county, legislative_district, congressional_district, party, max_selections, display_order) VALUES
--   ('Governor and Lt. Governor', 'federal', 'Anne Arundel', NULL, NULL, 'Republican', 1, 1),
--   ('U.S. Senator', 'federal', 'Anne Arundel', NULL, NULL, 'Republican', 1, 2),
--   ('U.S. Representative - District 3', 'federal', 'Anne Arundel', NULL, 'MD-3', 'Republican', 1, 3),
--   ('State Senator - District 12', 'state', 'Anne Arundel', 12, NULL, 'Republican', 1, 4),
--   ('House of Delegates - District 12', 'state', 'Anne Arundel', 12, NULL, 'Republican', 3, 5),
--   ('County Executive', 'county', 'Anne Arundel', NULL, NULL, 'Republican', 1, 6),
--   ('County Council - District 1', 'county', 'Anne Arundel', NULL, NULL, 'Republican', 1, 7),
--   ('Board of Education', 'county', 'Anne Arundel', NULL, NULL, 'Nonpartisan', 4, 8);
-- 
-- -- Example candidates (replace with real data):
-- INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, display_order)
-- SELECT r.id, 'Candidate Name', 'Republican', false, 1
-- FROM md_ballot_races r WHERE r.race_title = 'Governor and Lt. Governor' AND r.county = 'Anne Arundel';

-- ----------------------------------------------------------------------------
-- BALTIMORE COUNTY
-- Legislative Districts: 7, 8, 10, 11, 42, 43, 44
-- Congressional District: MD-1, MD-2, MD-7
-- ----------------------------------------------------------------------------
-- TEMPLATE: (Similar to Anne Arundel, adjust districts)

-- ----------------------------------------------------------------------------
-- PRINCE GEORGE'S COUNTY
-- Legislative Districts: 22, 23, 24, 25, 26, 27, 47
-- Congressional District: MD-4, MD-5
-- ----------------------------------------------------------------------------
-- TEMPLATE: (Similar to Anne Arundel, adjust districts)

-- ----------------------------------------------------------------------------
-- HOWARD COUNTY
-- Legislative Districts: 9, 12, 13
-- Congressional District: MD-3, MD-7
-- ----------------------------------------------------------------------------
-- TEMPLATE: (Similar to Anne Arundel, adjust districts)

-- ============================================================================
-- PHASE 3: ALL OTHER MARYLAND COUNTIES
-- ============================================================================

-- Counties to add (alphabetically):
-- 1. Allegany County (Districts 1)
-- 2. Baltimore City (Districts 40, 41, 43, 44, 45, 46)
-- 3. Calvert County (Districts 27, 28, 29)
-- 4. Caroline County (Districts 35, 37)
-- 5. Carroll County (Districts 4, 5)
-- 6. Cecil County (Districts 34, 35)
-- 7. Charles County (Districts 27, 28)
-- 8. Dorchester County (Districts 37, 38)
-- 9. Frederick County (Districts 3, 4)
-- 10. Garrett County (District 1)
-- 11. Harford County (Districts 7, 34, 35)
-- 12. Kent County (District 36)
-- 13. Queen Anne's County (Districts 36, 37)
-- 14. St. Mary's County (Districts 27, 29)
-- 15. Somerset County (District 38)
-- 16. Talbot County (District 37)
-- 17. Washington County (District 2)
-- 18. Wicomico County (Districts 37, 38)
-- 19. Worcester County (District 38)

-- ============================================================================
-- AUTOMATION HELPER: Generate Race Templates
-- ============================================================================
-- Use this function to generate base races for any county

CREATE OR REPLACE FUNCTION generate_county_races(
  p_county TEXT,
  p_legislative_districts INTEGER[],
  p_congressional_districts TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_result TEXT := '';
  v_district INTEGER;
  v_cong_district TEXT;
BEGIN
  -- Federal races (statewide)
  v_result := v_result || format(
    E'-- %s COUNTY\n',
    p_county
  );
  
  v_result := v_result || format(
    E'INSERT INTO md_ballot_races (race_title, race_type, county, legislative_district, congressional_district, party, max_selections, display_order) VALUES\n' ||
    E'  (''Governor and Lt. Governor'', ''federal'', ''%s'', NULL, NULL, ''Republican'', 1, 1),\n' ||
    E'  (''U.S. Senator'', ''federal'', ''%s'', NULL, NULL, ''Republican'', 1, 2)',
    p_county, p_county
  );
  
  -- Congressional districts
  FOREACH v_cong_district IN ARRAY p_congressional_districts
  LOOP
    v_result := v_result || format(
      E',\n  (''U.S. Representative - District %s'', ''federal'', ''%s'', NULL, ''%s'', ''Republican'', 1, 3)',
      substring(v_cong_district from 4), p_county, v_cong_district
    );
  END LOOP;
  
  -- State legislative districts
  FOREACH v_district IN ARRAY p_legislative_districts
  LOOP
    v_result := v_result || format(
      E',\n  (''State Senator - District %s'', ''state'', ''%s'', %s, NULL, ''Republican'', 1, 4)',
      v_district, p_county, v_district
    );
    v_result := v_result || format(
      E',\n  (''House of Delegates - District %s'', ''state'', ''%s'', %s, NULL, ''Republican'', 3, 5)',
      v_district, p_county, v_district
    );
  END LOOP;
  
  -- County races
  v_result := v_result || format(
    E',\n  (''County Executive'', ''county'', ''%s'', NULL, NULL, ''Republican'', 1, 6)',
    p_county
  );
  v_result := v_result || format(
    E',\n  (''County Council At-Large'', ''county'', ''%s'', NULL, NULL, ''Republican'', 4, 7)',
    p_county
  );
  v_result := v_result || format(
    E',\n  (''Board of Education'', ''county'', ''%s'', NULL, NULL, ''Nonpartisan'', 4, 8);\n',
    p_county
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- EXAMPLE: Generate Anne Arundel County Template
-- ============================================================================
-- SELECT generate_county_races(
--   'Anne Arundel',
--   ARRAY[12, 21, 30, 31, 32, 33],
--   ARRAY['MD-3', 'MD-5']
-- );

-- ============================================================================
-- DATA SOURCES FOR CANDIDATE INFORMATION
-- ============================================================================
-- Official sources to populate candidate data:
-- 1. Maryland State Board of Elections: https://elections.maryland.gov/
-- 2. County Boards of Elections (contact for local races)
-- 3. Official candidate filings (available ~3-4 months before primary)
--
-- For 2026 Primary:
-- - Candidate filing deadline: Typically February 2026
-- - Official lists published: March 2026
-- - Primary Election: June 23, 2026
--
-- RECOMMENDATION: Seed Montgomery County now for alpha testing.
-- Add other counties as:
-- 1. Users from those counties sign up
-- 2. Official candidate lists become available
-- 3. Testing confirms the Montgomery County implementation works

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
-- - Montgomery County (Districts 14-20) is COMPLETE
-- - Focus on counties with highest population/user base first:
--   1. Montgomery (✅ DONE)
--   2. Prince George's
--   3. Baltimore County
--   4. Anne Arundel
--   5. Howard
-- - For ballot questions/amendments, add as separate races with type 'ballot_question'
-- - Update `hard_party_endorsed` flag based on official party endorsements
-- - Coordinate with party leadership to mark endorsed candidates
