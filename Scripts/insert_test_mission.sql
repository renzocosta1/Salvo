-- Insert a test mission for testing Task #5
-- This mission requires photo proof and awards 100 XP

INSERT INTO missions (
  party_id,
  title,
  description,
  xp_reward,
  requires_photo
) VALUES (
  (SELECT id FROM parties WHERE name = 'Hard Party' LIMIT 1),
  'Document Your Workspace',
  'Take a photo of your workspace or study area. Show us where the magic happens! This mission helps us understand how warriors operate in their daily environment.',
  100,
  true
);

-- Verify the mission was created
SELECT 
  m.id,
  m.title,
  m.description,
  m.xp_reward,
  m.requires_photo,
  p.name as party_name
FROM missions m
JOIN parties p ON m.party_id = p.id
ORDER BY m.created_at DESC
LIMIT 1;
