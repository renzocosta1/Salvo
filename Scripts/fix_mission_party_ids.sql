-- Fix: Assign Task 29 missions to the user's party

-- Step 1: Check current state
SELECT 
  'USER PARTY' as check_type,
  pr.party_id,
  p.name as party_name
FROM auth.users u
JOIN profiles pr ON u.id = pr.id
LEFT JOIN parties p ON pr.party_id = p.id
WHERE u.email = 'renzorodriguez2001@gmail.com'

UNION ALL

SELECT 
  'MISSION PARTIES' as check_type,
  d.party_id,
  p.name as party_name
FROM directives d
LEFT JOIN parties p ON d.party_id = p.id
WHERE d.title LIKE '%Raid%' OR d.title LIKE '%Ballot%' OR d.title LIKE '%Siege%'
LIMIT 5;

-- Step 2: Update missions to use the user's party
DO $$
DECLARE
  v_user_party_id UUID;
BEGIN
  -- Get the user's party ID
  SELECT pr.party_id INTO v_user_party_id
  FROM auth.users u
  JOIN profiles pr ON u.id = pr.id
  WHERE u.email = 'renzorodriguez2001@gmail.com';
  
  RAISE NOTICE 'User party ID: %', v_user_party_id;
  
  -- Update all Task 29 missions to use the user's party
  UPDATE directives
  SET party_id = v_user_party_id
  WHERE title IN (
    '🎯 Relational Raid: Recruit Your Squad',
    '🗳️ Digital Ballot: Lock in Your Votes',
    '⚡ Early Raid: Vote Early, Secure Victory',
    '🔥 Election Day Siege: THE FINAL PUSH'
  );
  
  RAISE NOTICE 'Updated missions to user party';
END $$;

-- Step 3: Verify the fix
SELECT 
  d.id,
  d.title,
  d.mission_type,
  d.party_id,
  p.name as party_name
FROM directives d
LEFT JOIN parties p ON d.party_id = p.id
WHERE d.title IN (
  '🎯 Relational Raid: Recruit Your Squad',
  '🗳️ Digital Ballot: Lock in Your Votes',
  '⚡ Early Raid: Vote Early, Secure Victory',
  '🔥 Election Day Siege: THE FINAL PUSH'
)
ORDER BY d.created_at;
