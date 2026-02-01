-- Fix missing RLS policies for missions and user_missions tables
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled (it should be)
-- If these return 't' (true), RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('missions', 'user_missions');

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "missions_select" ON missions;
DROP POLICY IF EXISTS "user_missions_select_own" ON user_missions;
DROP POLICY IF EXISTS "user_missions_insert_own" ON user_missions;
DROP POLICY IF EXISTS "user_missions_update_own" ON user_missions;

-- Create missions SELECT policy (allow all authenticated users to view missions)
CREATE POLICY "missions_select" ON missions 
FOR SELECT 
TO authenticated 
USING (true);

-- Create user_missions policies
CREATE POLICY "user_missions_select_own" ON user_missions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "user_missions_insert_own" ON user_missions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_missions_update_own" ON user_missions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('missions', 'user_missions')
ORDER BY tablename, policyname;
