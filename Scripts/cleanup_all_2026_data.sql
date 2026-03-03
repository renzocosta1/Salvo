-- =====================================================
-- Clean Out All 2026 Placeholder Ballot Data
-- =====================================================
-- This script removes all placeholder 2026 data to make room
-- for real 2024 primary ballot data for testing

-- =====================================================
-- STEP 1: Delete all ballot candidates
-- =====================================================

DELETE FROM md_ballot_candidates;

-- =====================================================
-- STEP 2: Delete all ballot races
-- =====================================================

DELETE FROM md_ballot_races;

-- =====================================================
-- STEP 3: Delete all ballots
-- =====================================================

DELETE FROM md_ballots;

-- =====================================================
-- STEP 4: Clean up Polymarket data (optional)
-- =====================================================
-- We'll re-add 2024-specific markets later if needed

DELETE FROM polymarket_alerts;
DELETE FROM polymarket_odds;
DELETE FROM polymarket_tracked_markets;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

-- Verify all ballot data is removed
SELECT 'Ballots remaining: ' || COUNT(*) FROM md_ballots;
SELECT 'Ballot races remaining: ' || COUNT(*) FROM md_ballot_races;
SELECT 'Ballot candidates remaining: ' || COUNT(*) FROM md_ballot_candidates;
SELECT 'Polymarket markets remaining: ' || COUNT(*) FROM polymarket_tracked_markets;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. This DOES NOT delete user data (profiles, XP, missions, etc.)
-- 2. This DOES NOT delete user_ballot_commitments (historical voting data)
-- 3. This DOES NOT delete endorsement_audit_log (endorsement history)
-- 4. After running this, you MUST seed 2024 ballot data for the app to work
-- 5. Run the Montgomery and Anne Arundel 2024 seed scripts next

-- =====================================================
-- Expected Result:
-- =====================================================
-- All counts should be 0 after this script runs
-- Users will see "No ballot available" until 2024 data is seeded
