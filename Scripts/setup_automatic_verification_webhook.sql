-- Setup Automatic Mission Verification via Database Webhook
-- This creates a trigger that automatically calls the Edge Function when proof is submitted

-- Create a function to notify the Edge Function when a mission proof is submitted
CREATE OR REPLACE FUNCTION notify_mission_proof_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when proof_photo_url changes from NULL to a value
  -- AND status is 'submitted'
  IF (OLD.proof_photo_url IS NULL AND NEW.proof_photo_url IS NOT NULL) 
     AND NEW.status = 'submitted' THEN
    
    -- Call the Edge Function via pg_net (Supabase's HTTP extension)
    PERFORM
      net.http_post(
        url := 'https://zzkttbyaqihrezzowbar.supabase.co/functions/v1/verify-mission',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6a3R0YnlhcWlocmV6em93YmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTQ5MTAsImV4cCI6MjA4NTM5MDkxMH0.WT2Ogr1hfQrMOQ0kTdRQmQAv4Jha47e978wClxPhtD8'
        ),
        body := jsonb_build_object(
          'record', jsonb_build_object('id', NEW.id)
        )
      ) AS request_id;
    
    RAISE NOTICE 'Mission verification triggered for user_mission: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_user_missions_auto_verify ON user_missions;

CREATE TRIGGER tr_user_missions_auto_verify
  AFTER UPDATE ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION notify_mission_proof_submitted();

-- Test: Check if pg_net extension is available
SELECT * FROM pg_available_extensions WHERE name = 'pg_net';

-- If not available, enable it:
CREATE EXTENSION IF NOT EXISTS pg_net;

COMMENT ON TRIGGER tr_user_missions_auto_verify ON user_missions IS 
  'Automatically triggers AI verification via Edge Function when mission proof is uploaded';

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'tr_user_missions_auto_verify';
