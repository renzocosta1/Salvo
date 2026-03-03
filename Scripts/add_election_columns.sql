-- =====================================================
-- Add Election Columns to md_ballots Table
-- =====================================================
-- This script adds columns needed for 2024 ballot seeding

-- Add election_type column (if it doesn't exist)
-- This is an alias/addition to election_name for more specific typing
ALTER TABLE md_ballots 
ADD COLUMN IF NOT EXISTS election_type TEXT;

-- Add is_active column for toggling ballot visibility
ALTER TABLE md_ballots 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for active ballots
CREATE INDEX IF NOT EXISTS idx_md_ballots_active 
ON md_ballots(is_active) 
WHERE is_active = true;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'md_ballots' 
  AND column_name IN ('election_type', 'election_date', 'election_name', 'is_active')
ORDER BY column_name;

-- =====================================================
-- Expected Result:
-- =====================================================
-- Should show:
-- - election_date (already exists)
-- - election_name (already exists)
-- - election_type (newly added)
-- - is_active (newly added, default: true)
