-- Reset Test Mission for Fresh Upload
-- This clears the proof and resets status to allow testing the full flow

-- Find your user_mission record (adjust the ID if needed)
UPDATE user_missions
SET 
  status = 'pending',
  proof_photo_url = NULL,
  submitted_at = NULL,
  verified_at = NULL,
  verified_by = NULL,
  updated_at = NOW()
WHERE id = 'a9fa63d8-eac4-488f-8ec8-ce1722953f49';

-- Verify the reset
SELECT 
  id,
  mission_id,
  status,
  proof_photo_url,
  submitted_at,
  created_at
FROM user_missions
WHERE id = 'a9fa63d8-eac4-488f-8ec8-ce1722953f49';
