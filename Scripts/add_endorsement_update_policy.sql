-- =====================================================
-- Add RLS Policy for Leaders to Update Endorsements
-- =====================================================
-- This allows users with leadership_role to update
-- the hard_party_endorsed field on ballot candidates
--
-- CRITICAL: Run this BEFORE testing endorsements!
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Leaders can update endorsements" ON md_ballot_candidates;

-- Create policy allowing leaders to update endorsements
CREATE POLICY "Leaders can update endorsements"
  ON md_ballot_candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.leadership_role IS NOT NULL
        AND profiles.leadership_role IN ('district_leader', 'county_leader', 'state_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.leadership_role IS NOT NULL
        AND profiles.leadership_role IN ('district_leader', 'county_leader', 'state_leader')
    )
  );

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'md_ballot_candidates'
  AND policyname = 'Leaders can update endorsements';

-- =====================================================
-- Expected Result:
-- =====================================================
-- Should show one row:
-- tablename: md_ballot_candidates
-- policyname: Leaders can update endorsements
-- cmd: UPDATE
-- roles: {authenticated}
--
-- This allows any authenticated user with a leadership_role
-- (district_leader, county_leader, or state_leader) to
-- update the hard_party_endorsed field on ballot candidates
-- =====================================================

-- Test the policy (optional - run as a leader account)
-- UPDATE md_ballot_candidates
-- SET hard_party_endorsed = true
-- WHERE id = 'some-candidate-id';
-- Should succeed if you have leadership_role set
-- =====================================================
