-- =====================================================
-- Create Ballot Notifications Table and Trigger System
-- =====================================================
-- This script creates the infrastructure for automatic push notifications
-- when ballots are ready for users to review

-- =====================================================
-- STEP 1: Create ballot_notifications table
-- =====================================================

CREATE TABLE IF NOT EXISTS ballot_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  county TEXT NOT NULL,
  legislative_district TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('ballot_ready', 'ballot_updated')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ballot_notifications_user_id 
ON ballot_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_ballot_notifications_geography 
ON ballot_notifications(county, legislative_district);

CREATE INDEX IF NOT EXISTS idx_ballot_notifications_sent_at 
ON ballot_notifications(sent_at DESC);

-- =====================================================
-- STEP 2: Enable Row Level Security
-- =====================================================

ALTER TABLE ballot_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own ballot notifications"
ON ballot_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can insert notifications (via Edge Function)
CREATE POLICY "System can insert ballot notifications"
ON ballot_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can acknowledge (update) their own notifications
CREATE POLICY "Users can acknowledge own notifications"
ON ballot_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STEP 3: Create function to call Edge Function
-- =====================================================

CREATE OR REPLACE FUNCTION notify_users_ballot_ready()
RETURNS TRIGGER AS $$
DECLARE
  v_county TEXT;
  v_district TEXT;
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Extract county and legislative district from the ballot
  SELECT county INTO v_county FROM md_ballots WHERE id = NEW.ballot_id LIMIT 1;
  
  -- Extract district from race title (assumes format like "State Senator, District 16")
  SELECT DISTINCT legislative_district INTO v_district
  FROM md_ballots
  WHERE id = NEW.ballot_id
  LIMIT 1;
  
  -- Get Supabase URL and anon key from environment
  -- NOTE: These need to be set as Supabase secrets
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.anon_key', true);
  
  -- Call Edge Function via pg_net extension
  -- This will be async and won't block the INSERT
  IF v_county IS NOT NULL AND v_district IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-ballot-ready',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'county', v_county,
        'legislative_district', v_district,
        'notification_type', 'ballot_ready'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Create trigger on md_ballot_races table
-- =====================================================
-- This triggers when new races are added to a ballot
-- DISABLED FOR NOW: Requires Supabase URL/key configuration
-- To enable: Set database settings and uncomment the CREATE TRIGGER below

DROP TRIGGER IF EXISTS trigger_notify_ballot_ready ON md_ballot_races;

-- COMMENTED OUT FOR TESTING:
-- To enable automatic notifications, first run:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR-PROJECT-REF.supabase.co';
-- ALTER DATABASE postgres SET app.settings.anon_key = 'YOUR-ANON-KEY';
-- Then uncomment this trigger:

/*
CREATE TRIGGER trigger_notify_ballot_ready
AFTER INSERT ON md_ballot_races
FOR EACH ROW
EXECUTE FUNCTION notify_users_ballot_ready();
*/

-- =====================================================
-- STEP 5: Verification queries
-- =====================================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'ballot_notifications'
ORDER BY ordinal_position;

-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_ballot_ready';

-- =====================================================
-- Notes:
-- =====================================================
-- 1. The trigger automatically fires when ballot races are inserted
-- 2. The Edge Function handles the actual notification sending
-- 3. Users must have expo_push_token and notifications_enabled=true
-- 4. Notifications are batched to Expo's API (100 at a time)
-- 5. Set Supabase URL/Key via: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://...';
