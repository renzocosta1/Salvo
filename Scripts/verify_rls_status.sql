-- Verify RLS is working correctly for missions table

-- Step 1: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'missions';

-- Step 2: Check what policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'missions';

-- Step 3: Check if missions actually exist (run as service role, bypasses RLS)
SELECT 
  id,
  title,
  party_id,
  created_at
FROM missions
LIMIT 5;

-- Step 4: Test the actual policy by selecting as authenticated user
-- This should work if RLS policy is correct
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a8df52ea-22b7-46d7-95b6-c071b2b84292"}';

SELECT 
  id,
  title,
  party_id
FROM missions 
WHERE id = '4b4df90a-c0d5-4d7e-aaec-2e92204eff8f';

RESET ROLE;
