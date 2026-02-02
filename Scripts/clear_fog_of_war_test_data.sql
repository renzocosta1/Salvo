-- Clear fog of war test data for fresh testing
-- Run this in Supabase SQL Editor

-- Delete all check-ins (this won't affect your profile/directives)
DELETE FROM check_ins;

-- Delete all revealed H3 tiles
DELETE FROM h3_tiles;

-- Verify it's clean
SELECT 'check_ins' as table_name, COUNT(*) as count FROM check_ins
UNION ALL
SELECT 'h3_tiles' as table_name, COUNT(*) FROM h3_tiles;
