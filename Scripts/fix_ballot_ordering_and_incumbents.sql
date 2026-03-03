-- ============================================================================
-- FIX BALLOT ORDERING AND ADD INCUMBENTS
-- ============================================================================
-- This script standardizes race ordering across all ballots and adds incumbent info
-- ============================================================================

-- Step 1: Add incumbent_name column to md_ballot_races if it doesn't exist
ALTER TABLE md_ballot_races 
ADD COLUMN IF NOT EXISTS incumbent_name TEXT;

-- Step 2: Standardize position_order for all ballots
-- Standard order:
-- 1. U.S. Senator (Federal, Statewide)
-- 2. U.S. Representative (Federal, by District)
-- 3. Governor (State, Statewide)
-- 4. State Senator (State, by Legislative District)
-- 5. House of Delegates (State, by Legislative District)
-- 6. County Executive (County, by County)
-- 7. County Council (County, by County/District)
-- 8. Board of Education (Local, by County)
-- 9. Circuit Court Judges (Judicial)
-- 10. Constitutional Amendments (Ballot Questions)

-- Update U.S. Senator races (position 1)
UPDATE md_ballot_races
SET position_order = 1
WHERE race_title ILIKE '%U.S. Senator%'
   OR race_title ILIKE '%United States Senator%'
   OR race_title ILIKE '%Senator%' AND race_type = 'federal';

-- Update U.S. Representative races (position 2)
UPDATE md_ballot_races
SET position_order = 2
WHERE race_title ILIKE '%U.S. Representative%'
   OR race_title ILIKE '%Representative in Congress%'
   OR race_title ILIKE '%Congress%' AND race_type = 'federal';

-- Update Governor races (position 3)
UPDATE md_ballot_races
SET position_order = 3
WHERE race_title ILIKE '%Governor%'
   AND race_type = 'state';

-- Update State Senator races (position 4)
UPDATE md_ballot_races
SET position_order = 4
WHERE race_title ILIKE '%State Senator%'
   OR (race_title ILIKE '%Senator%' AND race_type = 'state');

-- Update House of Delegates races (position 5)
UPDATE md_ballot_races
SET position_order = 5
WHERE race_title ILIKE '%House of Delegates%'
   OR race_title ILIKE '%Delegate%';

-- Update County Executive races (position 6)
UPDATE md_ballot_races
SET position_order = 6
WHERE race_title ILIKE '%County Executive%';

-- Update County Council races (position 7)
UPDATE md_ballot_races
SET position_order = 7
WHERE race_title ILIKE '%County Council%';

-- Update Board of Education races (position 8)
UPDATE md_ballot_races
SET position_order = 8
WHERE race_title ILIKE '%Board of Education%';

-- Update Judicial races (position 9)
UPDATE md_ballot_races
SET position_order = 9
WHERE race_type = 'judicial';

-- Update Ballot Questions/Amendments (position 10)
UPDATE md_ballot_races
SET position_order = 10
WHERE race_type = 'ballot_question';

-- Step 3: Add incumbent information for current Maryland offices (2026 Primary)

-- U.S. Senator - Ben Cardin (retiring, no incumbent running)
UPDATE md_ballot_races
SET incumbent_name = 'Ben Cardin (D) - Retiring'
WHERE race_title ILIKE '%U.S. Senator%';

-- Governor - Wes Moore (D) - First term, not up for re-election until 2026 general
UPDATE md_ballot_races
SET incumbent_name = 'Wes Moore (D) - Incumbent'
WHERE race_title ILIKE '%Governor%';

-- U.S. Representative District 5 (Glenn Ivey - D)
UPDATE md_ballot_races
SET incumbent_name = 'Glenn Ivey (D) - Incumbent'
WHERE race_title ILIKE '%District 5%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 6 (Neil Parrott running for Republican)
UPDATE md_ballot_races
SET incumbent_name = 'David Trone (D) - Incumbent, running for Senate'
WHERE race_title ILIKE '%District 6%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 1
UPDATE md_ballot_races
SET incumbent_name = 'Andy Harris (R) - Incumbent'
WHERE race_title ILIKE '%District 1%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 2
UPDATE md_ballot_races
SET incumbent_name = 'Dutch Ruppersberger (D) - Retired, Open Seat'
WHERE race_title ILIKE '%District 2%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 3
UPDATE md_ballot_races
SET incumbent_name = 'John Sarbanes (D) - Retired, Open Seat'
WHERE race_title ILIKE '%District 3%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 4
UPDATE md_ballot_races
SET incumbent_name = 'Glenn Ivey (D) - Incumbent'
WHERE race_title ILIKE '%District 4%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 7
UPDATE md_ballot_races
SET incumbent_name = 'Kweisi Mfume (D) - Incumbent'
WHERE race_title ILIKE '%District 7%' AND race_title ILIKE '%Representative%';

-- U.S. Representative District 8
UPDATE md_ballot_races
SET incumbent_name = 'Jamie Raskin (D) - Incumbent'
WHERE race_title ILIKE '%District 8%' AND race_title ILIKE '%Representative%';

-- Montgomery County Executive - Marc Elrich (D)
UPDATE md_ballot_races
SET incumbent_name = 'Marc Elrich (D) - Incumbent'
WHERE race_title ILIKE '%County Executive%' 
  AND ballot_id IN (
    SELECT id FROM md_ballots WHERE county = 'Montgomery'
  );

-- Anne Arundel County Executive - Steuart Pittman (D)
UPDATE md_ballot_races
SET incumbent_name = 'Steuart Pittman (D) - Incumbent'
WHERE race_title ILIKE '%County Executive%' 
  AND ballot_id IN (
    SELECT id FROM md_ballots WHERE county = 'Anne Arundel'
  );

-- Step 4: Clean up any general election candidates that shouldn't be in PRIMARY ballot
-- For the PRIMARY ballot, we should ONLY have Republican primary candidates
-- Remove any Democratic candidates that might have been added by mistake

-- Check if any races have mixed party candidates (shouldn't happen in primary)
DO $$
DECLARE
  mixed_race RECORD;
BEGIN
  FOR mixed_race IN 
    SELECT DISTINCT r.id, r.race_title, r.ballot_id
    FROM md_ballot_races r
    JOIN md_ballot_candidates c ON r.id = c.race_id
    WHERE c.candidate_party NOT ILIKE '%Republican%'
      AND r.race_type IN ('federal', 'state')
  LOOP
    RAISE NOTICE 'WARNING: Race "%" has non-Republican candidates in PRIMARY ballot', mixed_race.race_title;
  END LOOP;
END $$;

-- Step 5: Verify ordering
SELECT 
  b.county,
  b.legislative_district,
  r.position_order,
  r.race_title,
  r.race_type,
  r.incumbent_name,
  COUNT(c.id) as candidate_count
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
LEFT JOIN md_ballot_candidates c ON r.id = c.race_id
GROUP BY b.county, b.legislative_district, r.position_order, r.race_title, r.race_type, r.incumbent_name
ORDER BY b.county, b.legislative_district, r.position_order;
