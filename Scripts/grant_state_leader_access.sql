-- =====================================================
-- Grant State Leader Access to renzorodriguez2001@gmail.com
-- =====================================================
-- This script assigns the 'state_leader' role to the specified user,
-- which will enable the Admin tab and endorsement management capabilities.

-- Step 1: Find and update the user profile
-- This joins with auth.users to find the user by email

UPDATE profiles
SET 
  leadership_role = 'state_leader',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'renzorodriguez2001@gmail.com'
);

-- Step 2: Verify the update
SELECT 
  p.id,
  u.email,
  p.display_name,
  p.leadership_role,
  p.county,
  p.legislative_district,
  p.congressional_district,
  p.created_at,
  p.updated_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'renzorodriguez2001@gmail.com';

-- =====================================================
-- Expected Result:
-- =====================================================
-- The user should now have:
-- - leadership_role: 'state_leader'
-- - Admin tab visible in the app
-- - Access to endorsement management features
-- - Ability to endorse candidates for all Maryland counties and districts

-- =====================================================
-- Notes:
-- =====================================================
-- 1. State leaders can manage endorsements across the entire state
-- 2. They are not restricted to specific counties or districts
-- 3. The Admin tab will automatically appear due to the leadership_role being set
-- 4. If the user doesn't exist yet, this script won't create them - they must sign up first
