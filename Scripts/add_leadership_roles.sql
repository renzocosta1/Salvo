-- ============================================================================
-- ADD LEADERSHIP ROLES TO PROFILES
-- ============================================================================
-- Enables hierarchical endorsement permissions
-- ============================================================================

-- Add leadership_role column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS leadership_role TEXT;

-- Add county and district fields if they don't exist yet
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS county TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS legislative_district TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS congressional_district TEXT;

-- Create index for faster leader lookups
CREATE INDEX IF NOT EXISTS idx_profiles_leadership_role 
ON profiles(leadership_role) 
WHERE leadership_role IS NOT NULL;

-- Create composite index for geography-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_geography 
ON profiles(county, legislative_district, congressional_district);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('leadership_role', 'county', 'legislative_district', 'congressional_district')
ORDER BY column_name;

-- MANUAL STEP: Set yourself as state leader
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from profiles table
-- Run this after confirming your user ID:
-- UPDATE profiles SET leadership_role = 'state_leader' WHERE id = 'YOUR_USER_ID_HERE';

-- Check who has leadership roles
SELECT 
  id,
  display_name,
  leadership_role,
  county,
  legislative_district,
  congressional_district
FROM profiles
WHERE leadership_role IS NOT NULL
ORDER BY leadership_role;
