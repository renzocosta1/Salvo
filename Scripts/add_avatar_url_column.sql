-- =====================================================
-- Add avatar_url Column to Profiles
-- =====================================================
-- Adds support for profile pictures
-- =====================================================

-- Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE '✓ Added avatar_url column to profiles';
  ELSE
    RAISE NOTICE 'ℹ avatar_url column already exists';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url 
  ON profiles(avatar_url) 
  WHERE avatar_url IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ Profile avatar support added!';
  RAISE NOTICE '📸 Users can now upload and save profile pictures';
END $$;
