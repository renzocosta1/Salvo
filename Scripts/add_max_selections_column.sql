-- ============================================================================
-- ADD max_selections COLUMN TO md_ballot_races
-- ============================================================================
-- This column indicates how many candidates can be selected in a race
-- (e.g., "Vote for up to 3" for House of Delegates)
-- ============================================================================

ALTER TABLE md_ballot_races 
ADD COLUMN IF NOT EXISTS max_selections INTEGER DEFAULT 1;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'md_ballot_races'
  AND column_name IN ('max_selections', 'incumbent_name')
ORDER BY column_name;
