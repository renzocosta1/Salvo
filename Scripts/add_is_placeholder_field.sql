-- ============================================================================
-- ADD is_placeholder FIELD TO md_ballot_candidates
-- ============================================================================
-- Marks generic placeholder candidates vs. real filed candidates
-- ============================================================================

ALTER TABLE md_ballot_candidates 
ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT false;

-- Mark all generic placeholders
UPDATE md_ballot_candidates
SET is_placeholder = true
WHERE candidate_name ILIKE '%Republican Candidate%'
   OR candidate_name ILIKE '%Democratic Candidate%'
   OR candidate_name ILIKE '%Endorsed Candidate%'
   OR candidate_name ILIKE '%Other Candidate%'
   OR candidate_name ILIKE '%Candidate A%'
   OR candidate_name ILIKE '%Candidate B%'
   OR candidate_name ILIKE '%Candidate C%'
   OR candidate_name ILIKE '%Candidate D%'
   OR candidate_name ILIKE '%Candidate E%';

-- Verify the column and placeholders
SELECT 
  r.race_title,
  c.candidate_name,
  c.hard_party_endorsed,
  c.is_placeholder
FROM md_ballot_candidates c
JOIN md_ballot_races r ON c.race_id = r.id
ORDER BY c.is_placeholder DESC, r.position_order, c.candidate_order;
