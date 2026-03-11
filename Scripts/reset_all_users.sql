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

-- Disable triggers temporarily
ALTER TABLE md_ballot_races DISABLE TRIGGER trigger_notify_ballot_ready;

-- Delete user-specific data (cascading will handle related tables)
DELETE FROM endorsement_audit_log;
DELETE FROM ballot_notifications;
DELETE FROM user_missions;
DELETE FROM salvos;
DELETE FROM check_ins;
DELETE FROM h3_tiles;
DELETE FROM referrals;
DELETE FROM user_ballot_commitments;

-- Delete all profiles (this cascades to auth.users via trigger)
-- ⚠️ This removes ALL user accounts!
DELETE FROM profiles;

-- Re-enable triggers
ALTER TABLE md_ballot_races ENABLE TRIGGER trigger_notify_ballot_ready;

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
