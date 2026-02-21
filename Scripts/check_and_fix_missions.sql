-- Check what directives exist and which party they belong to
SELECT 
  d.id,
  d.title,
  d.mission_type,
  d.requires_gps,
  p.name as party_name,
  d.party_id
FROM directives d
LEFT JOIN parties p ON d.party_id = p.id
ORDER BY d.created_at DESC;

-- Check which party your user belongs to
SELECT 
  u.email,
  pr.id as profile_id,
  pr.party_id,
  p.name as party_name
FROM auth.users u
LEFT JOIN profiles pr ON u.id = pr.id
LEFT JOIN parties p ON pr.party_id = p.id
WHERE u.email = 'renzorodriguez2001@gmail.com';

-- NOW FIX IT: Delete old test missions and ensure Task 29 missions exist for The Hard Party
DO $$
DECLARE
  v_party_id UUID;
  v_user_party_id UUID;
BEGIN
  -- Get The Hard Party ID
  SELECT id INTO v_party_id FROM parties WHERE name = 'The Hard Party' LIMIT 1;
  
  -- Get the user's party ID
  SELECT pr.party_id INTO v_user_party_id 
  FROM auth.users u
  JOIN profiles pr ON u.id = pr.id
  WHERE u.email = 'renzorodriguez2001@gmail.com';
  
  RAISE NOTICE 'The Hard Party ID: %', v_party_id;
  RAISE NOTICE 'User Party ID: %', v_user_party_id;
  
  -- Delete old test missions (but keep Task 29 missions if they exist)
  DELETE FROM directives 
  WHERE title IN ('CONQUER THE NORTH', 'RAID THE CITADEL', 'STORM THE GATES')
  AND mission_type IS NULL;
  
  RAISE NOTICE 'Deleted old test missions';
  
  -- Check if Task 29 missions exist
  IF NOT EXISTS (
    SELECT 1 FROM directives 
    WHERE title LIKE '%Relational Raid%' 
    AND party_id = v_party_id
  ) THEN
    -- Task 29 missions don't exist yet, create them
    RAISE NOTICE 'Creating Task 29 missions...';
    
    -- Mission 1: Relational Raid
    INSERT INTO directives (
      party_id, title, body, target_goal, mission_deadline, requires_gps
    ) VALUES (
      v_party_id,
      '🎯 Relational Raid: Recruit Your Squad',
      E'BUILD YOUR SQUAD\n\nThe silent majority needs to organize. Sync your contacts and invite Maryland voters to join the movement.\n\n✅ MISSION BRIEF:\n- Import contacts from your phonebook\n- Identify Maryland voters in your network\n- Send personalized invitations via SMS/Share\n- Track who joins and completes onboarding\n\n🏆 REWARD: +100 XP per successful recruit who completes onboarding',
      1000,
      '2026-06-23 20:00:00',
      FALSE
    );
    
    -- Mission 2: Digital Ballot
    INSERT INTO directives (
      party_id, title, body, target_goal, mission_deadline, requires_gps
    ) VALUES (
      v_party_id,
      '🗳️ Digital Ballot: Lock in Your Votes',
      E'COMMIT TO THE SLATE\n\nReview your district''s ballot and commit to voting for endorsed candidates. We vote as a bloc - that''s how we win power.\n\n✅ MISSION BRIEF:\n- Review all races for your district\n- Candidates highlighted in NEON GREEN are endorsed\n- Tap "Commit to Vote" for each race\n- Reach 100% ballot completion\n\n🏆 REWARD: +50 XP for full ballot completion',
      5000,
      '2026-06-23 07:00:00',
      FALSE
    );
    
    -- Mission 3: Early Raid
    INSERT INTO directives (
      party_id, title, body, target_goal, mission_type, mission_deadline, requires_gps
    ) VALUES (
      v_party_id,
      '⚡ Early Raid: Vote Early, Secure Victory',
      E'EARLY VOTING = GUARANTEED TURNOUT\n\nDon''t wait for Election Day. Vote early, upload proof, and lock in your contribution to the bloc.\n\n✅ MISSION BRIEF:\n- Find your nearest Early Voting center\n- Check in when you arrive (GPS required)\n- Vote for the full endorsed slate\n- Upload photo proof (I Voted sticker + polling place)\n\n🏆 REWARD: +200 XP + Squad Badge',
      2500,
      'EARLY_RAID',
      '2026-06-20 20:00:00',
      TRUE
    );
    
    -- Mission 4: Election Day Siege
    INSERT INTO directives (
      party_id, title, body, target_goal, mission_type, mission_deadline, requires_gps
    ) VALUES (
      v_party_id,
      '🔥 Election Day Siege: THE FINAL PUSH',
      E'THIS IS IT. GAME DAY.\n\nIf you haven''t voted yet, this is your last chance. Get to your polling place, vote the slate, upload proof.\n\n✅ MISSION BRIEF:\n- App will show you your assigned precinct\n- Tap to open Google Maps with directions\n- Vote for ALL endorsed candidates\n- Upload photo proof (I Voted sticker + ballot if allowed)\n\n🏆 REWARD: +250 XP + Legion Badge + Squad Status',
      10000,
      'ELECTION_DAY_SIEGE',
      '2026-06-23 20:00:00',
      FALSE
    );
    
    RAISE NOTICE 'Task 29 missions created successfully!';
  ELSE
    RAISE NOTICE 'Task 29 missions already exist';
  END IF;
  
END $$;

-- Final verification: Show all directives for The Hard Party
SELECT 
  d.id,
  d.title,
  d.mission_type,
  d.target_goal,
  d.requires_gps,
  d.mission_deadline
FROM directives d
JOIN parties p ON d.party_id = p.id
WHERE p.name = 'The Hard Party'
ORDER BY d.created_at;
