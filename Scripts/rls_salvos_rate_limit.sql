-- =============================================================================
-- RLS POLICY: Salvos Rate Limiting
-- =============================================================================
-- Enforce rate limit: 10 salvos per 60 seconds per user per directive
-- This prevents spam and ensures fair participation
-- =============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for authenticated users with rate limit" ON salvos;
DROP POLICY IF EXISTS "Enable read access for own salvos" ON salvos;

-- Enable RLS on salvos table
ALTER TABLE salvos ENABLE ROW LEVEL SECURITY;

-- Policy 1: INSERT with rate limiting
-- Users can only insert 10 salvos per directive per 60 seconds
CREATE POLICY "Enable insert for authenticated users with rate limit"
ON salvos
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() = user_id
  AND
  -- Check rate limit: count salvos in last 60 seconds
  (
    SELECT COUNT(*)
    FROM salvos
    WHERE user_id = auth.uid()
      AND directive_id = salvos.directive_id
      AND created_at > NOW() - INTERVAL '60 seconds'
  ) < 10
);

-- Policy 2: SELECT - Users can read all salvos (for counting/leaderboards)
CREATE POLICY "Enable read access for all authenticated users"
ON salvos
FOR SELECT
TO authenticated
USING (true);

-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run this to check if policies are active:
-- SELECT * FROM pg_policies WHERE tablename = 'salvos';

-- Test rate limit:
-- 1. Insert 10 salvos rapidly for a specific directive
-- 2. Try to insert an 11th - should be rejected
-- 3. Wait 60 seconds and try again - should succeed
