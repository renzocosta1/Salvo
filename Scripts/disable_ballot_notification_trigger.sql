-- =====================================================
-- Disable Ballot Notification Trigger
-- =====================================================
-- This script disables the automatic notification trigger
-- so ballot seeding doesn't fail

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_ballot_ready ON md_ballot_races;

-- Verify trigger is removed
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_ballot_ready';

-- =====================================================
-- Expected Result:
-- =====================================================
-- Should return 0 rows (trigger no longer exists)

-- =====================================================
-- Note:
-- =====================================================
-- You can re-enable the trigger later by uncommenting
-- the CREATE TRIGGER section in create_ballot_notifications.sql
-- after configuring database settings
