-- Force insert test mission with explicit party_id
-- First, let's see what parties exist
SELECT id, name FROM parties;

-- Delete any existing test missions to avoid duplicates
DELETE FROM missions WHERE title = 'Document Your Workspace';

-- Insert test mission with EXPLICIT party_id (replace with your actual party_id)
INSERT INTO missions (
  id,
  party_id,
  title,
  description,
  xp_reward,
  requires_photo
) VALUES (
  '4b4df90a-c0d5-4d7e-aaec-2e92204eff8f'::uuid,
  '74df6a5a-0abe-40ab-b70b-03a28722485e'::uuid,  -- Hard Party ID from your query
  'Document Your Workspace',
  'Take a photo of your workspace or study area. Show us where the magic happens! This mission helps us understand how warriors operate in their daily environment.',
  100,
  true
) ON CONFLICT (id) DO UPDATE
SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  party_id = EXCLUDED.party_id;

-- Verify it was created
SELECT 
  id,
  title,
  description,
  xp_reward,
  requires_photo,
  party_id,
  created_at
FROM missions 
WHERE id = '4b4df90a-c0d5-4d7e-aaec-2e92204eff8f';

-- Double check we can see it
SELECT COUNT(*) as total_missions FROM missions;
