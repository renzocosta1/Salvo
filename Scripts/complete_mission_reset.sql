-- Complete Mission Reset for Testing
-- This script completely resets a mission so you can test the full flow from scratch

-- Step 1: Delete the user_mission record entirely (fresh start)
DELETE FROM user_missions
WHERE id = 'a9fa63d8-eac4-488f-8ec8-ce1722953f49';

-- Step 2: Verify it's deleted
SELECT 
  id,
  mission_id,
  status,
  proof_photo_url
FROM user_missions
WHERE mission_id = '4b4df90a-c0d5-4d7e-aaec-2e92204eff8f';

-- Should return NO ROWS if successful

-- Step 3: Also delete any images from Storage manually:
-- Go to Supabase Dashboard → Storage → mission-proofs bucket
-- Delete all files

-- Now when you open the app:
-- 1. Click "TEST MISSION" button
-- 2. See "START MISSION" button (mission not started yet)
-- 3. Click "START MISSION"
-- 4. Take/pick photo
-- 5. Click "SUBMIT PROOF"
-- 6. AI will automatically verify it (once webhook is set up)
-- 7. Status changes to "verified" and you get XP!
