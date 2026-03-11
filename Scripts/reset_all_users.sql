-- =====================================================
-- RESET ALL USERS - Beta Testing Fresh Start
-- =====================================================
-- ⚠️ WARNING: This script DELETES ALL USER DATA
-- Use this to start fresh for beta testing
-- 
-- This will DELETE:
-- - All user profiles
-- - All user missions/progress
-- - All referrals
-- - All salvos
-- - All check-ins
-- - All endorsement audit logs
-- - All ballot notifications
--
-- This will PRESERVE:
-- - Ballot data (races, candidates)
-- - Polymarket markets and odds
-- - Party data
-- - Rank definitions
-- - Mission definitions
-- - Contract versions
-- =====================================================

-- Disable triggers temporarily (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_notify_ballot_ready' 
    AND tgrelid = 'md_ballot_races'::regclass
  ) THEN
    ALTER TABLE md_ballot_races DISABLE TRIGGER trigger_notify_ballot_ready;
    RAISE NOTICE '✓ Disabled trigger_notify_ballot_ready';
  ELSE
    RAISE NOTICE 'ℹ Trigger trigger_notify_ballot_ready does not exist, skipping';
  END IF;
END $$;

-- Delete user-specific data (cascading will handle related tables)
-- Using IF EXISTS checks to prevent errors on missing tables

DO $$
BEGIN
  -- endorsement_audit_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'endorsement_audit_log') THEN
    DELETE FROM endorsement_audit_log;
    RAISE NOTICE '✓ Deleted endorsement_audit_log data';
  END IF;

  -- ballot_notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ballot_notifications') THEN
    DELETE FROM ballot_notifications;
    RAISE NOTICE '✓ Deleted ballot_notifications data';
  END IF;

  -- user_missions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_missions') THEN
    DELETE FROM user_missions;
    RAISE NOTICE '✓ Deleted user_missions data';
  END IF;

  -- salvos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salvos') THEN
    DELETE FROM salvos;
    RAISE NOTICE '✓ Deleted salvos data';
  END IF;

  -- h3_tiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'h3_tiles') THEN
    DELETE FROM h3_tiles;
    RAISE NOTICE '✓ Deleted h3_tiles data';
  END IF;

  -- referrals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
    DELETE FROM referrals;
    RAISE NOTICE '✓ Deleted referrals data';
  END IF;

  -- user_ballot_commitments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ballot_commitments') THEN
    DELETE FROM user_ballot_commitments;
    RAISE NOTICE '✓ Deleted user_ballot_commitments data';
  END IF;
END $$;

-- Delete all profiles (this cascades to auth.users via trigger)
-- ⚠️ This removes ALL user accounts!
DELETE FROM profiles;

-- Re-enable triggers (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_notify_ballot_ready' 
    AND tgrelid = 'md_ballot_races'::regclass
  ) THEN
    ALTER TABLE md_ballot_races ENABLE TRIGGER trigger_notify_ballot_ready;
    RAISE NOTICE '✓ Re-enabled trigger_notify_ballot_ready';
  ELSE
    RAISE NOTICE 'ℹ Trigger trigger_notify_ballot_ready does not exist, skipping';
  END IF;
END $$;

-- Reset sequences if needed
-- (Not necessary - UUIDs auto-generate)

DO $$
BEGIN
  RAISE NOTICE '⚠️  ALL USER DATA HAS BEEN DELETED!';
  RAISE NOTICE '✅ Beta testing can start fresh';
  RAISE NOTICE '📊 Preserved: Ballot data, Polymarket markets, Party/Rank definitions';
  RAISE NOTICE '❌ Deleted: All users, missions, referrals, progress';
  RAISE NOTICE '🎯 Ready for new user signups!';
END $$;
