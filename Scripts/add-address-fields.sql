-- ============================================================================
-- Quick Migration: Add Address Fields to Profiles Table
-- ============================================================================
-- Run this in Supabase SQL Editor if you haven't run migration 005 yet
-- This adds only the address-related fields needed for Task 23
-- ============================================================================

-- Add geographic fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legislative_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS congressional_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Add indexes for geographic queries (improves query performance)
CREATE INDEX IF NOT EXISTS idx_profiles_county ON profiles(county);
CREATE INDEX IF NOT EXISTS idx_profiles_legislative_district ON profiles(legislative_district);
CREATE INDEX IF NOT EXISTS idx_profiles_congressional_district ON profiles(congressional_district);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'address_line1', 'city', 'state', 'zip_code',
    'county', 'legislative_district', 'congressional_district', 'geocoded_at'
  )
ORDER BY column_name;
