-- =====================================================
-- Add Push Notification Fields to Profiles Table
-- =====================================================
-- This script adds fields to support Expo push notifications
-- for alerting users when their ballot is ready

-- Add push notification fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ballot_notification_sent_at TIMESTAMPTZ;

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token 
ON profiles(expo_push_token) 
WHERE expo_push_token IS NOT NULL;

-- Add index for querying users with notifications enabled
CREATE INDEX IF NOT EXISTS idx_profiles_notifications_enabled 
ON profiles(notifications_enabled) 
WHERE notifications_enabled = true;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('expo_push_token', 'notifications_enabled', 'ballot_notification_sent_at')
ORDER BY column_name;

-- =====================================================
-- Expected Result:
-- =====================================================
-- Should show 3 new columns:
-- 1. expo_push_token (text, nullable)
-- 2. notifications_enabled (boolean, default: false)
-- 3. ballot_notification_sent_at (timestamp with time zone, nullable)
