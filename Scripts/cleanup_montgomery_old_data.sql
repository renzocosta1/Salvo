-- ============================================================================
-- CLEANUP OLD MONTGOMERY BALLOT DATA
-- ============================================================================
-- Removes incorrect general election data from Montgomery County ballots
-- Run this BEFORE running seed_montgomery_primary_clean.sql
-- ============================================================================

-- Delete candidates first (foreign key constraint)
DELETE FROM md_ballot_candidates
WHERE race_id IN (
  SELECT r.id 
  FROM md_ballot_races r
  JOIN md_ballots b ON r.ballot_id = b.id
  WHERE b.county = 'Montgomery'
);

-- Delete races
DELETE FROM md_ballot_races
WHERE ballot_id IN (
  SELECT id FROM md_ballots WHERE county = 'Montgomery'
);

-- Delete ballots
DELETE FROM md_ballots
WHERE county = 'Montgomery';

-- Verify cleanup
SELECT 
  COUNT(*) as montgomery_ballots_remaining
FROM md_ballots
WHERE county = 'Montgomery';

-- Should return 0
